using Grasshopper.Kernel;
using Grasshopper.Kernel.Types;
using GH_IO.Serialization;
using Nancy;
using Nancy.Extensions;
using Nancy.Routing;
using NodePen.Converters;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using Speckle.Core.Api;
using Speckle.Core.Credentials;
using Speckle.Core.Models;
using Speckle.Newtonsoft.Json;
using NJsonConvert = Newtonsoft.Json.JsonConvert;

namespace Rhino.Compute.Endpoints
{

  public class GrasshopperEndpointsModule : NancyModule
  {
    public GrasshopperEndpointsModule(IRouteCacheProvider routeCacheProvider)
    {
      Post["/files/gh"] = _ => HandleGrasshopperFileUpload(Context);
      Get["/grasshopper"] = _ => GetGrasshopperConfiguration();
      Post["/grasshopper/id/solution"] = _ => SolveGrasshopperDocument(Context);
    }

    public class NodePenSolutionRequestBody
    {
      [JsonProperty("solutionId")]
      public string SolutionId { get; set; }

      [JsonProperty("document")]
      public NodePenDocument Document { get; set; }
    }

    public class NodePenDocumentSpeckleStreamData : Base
    {
      public NodePenDocument Document { get; set; }

      public NodePenDocumentSolutionData SolutionData { get; set; }

    }

    public Response SolveGrasshopperDocument(NancyContext context)
    {
      // Parse request body
      string body = context.Request.Body.AsString();
      NodePenSolutionRequestBody requestData = NJsonConvert.DeserializeObject<NodePenSolutionRequestBody>(body);

      // Create Grasshopper document
      GH_Archive archive = NodePenConvert.Deserialize<GH_Archive>(requestData.Document);
      GH_Document definition = new GH_Document();
      _ = archive.ExtractObject(definition, "definition");

      definition.Enabled = true;
      definition.Profiler = GH_ProfilerMode.Processor;

      // Solve Grasshopper document
      Stopwatch documentSolutionTimer = new Stopwatch();

      documentSolutionTimer.Start();

      definition.NewSolution(true, GH_SolutionMode.Silent);

      documentSolutionTimer.Stop();

      // Collect document solution data
      var documentSolutionData = new NodePenDocumentSolutionData(requestData.SolutionId);

      documentSolutionData.DocumentRuntimeData.DurationMs = documentSolutionTimer.ElapsedMilliseconds;

      // Collect node solution data
      foreach (IGH_DocumentObject documentObject in definition.Objects)
      {
        switch (documentObject)
        {
          case IGH_Component componentInstance:
            {
              // Convert Grasshopper component solution data to node solution data
              var nodeSolutionData = new NodePenNodeSolutionData(componentInstance.InstanceGuid.ToString());

              nodeSolutionData.NodeRuntimeData.DurationMs = componentInstance.ProcessorTime.TotalMilliseconds;

              foreach (var runtimeMessage in componentInstance.RuntimeMessages(GH_RuntimeMessageLevel.Error))
              {
                var nodeRuntimeMessage = new NodePenNodeRuntimeDataMessage()
                {
                  Level = "error",
                  Message = runtimeMessage
                };

                nodeSolutionData.NodeRuntimeData.Messages.Add(nodeRuntimeMessage);
              }

              foreach (var runtimeMessage in componentInstance.RuntimeMessages(GH_RuntimeMessageLevel.Warning))
              {
                var nodeRuntimeMessage = new NodePenNodeRuntimeDataMessage()
                {
                  Level = "warn",
                  Message = runtimeMessage
                };

                nodeSolutionData.NodeRuntimeData.Messages.Add(nodeRuntimeMessage);
              }

              // Collect child param solution data
              List<IGH_Param> componentParams = new List<IGH_Param>();
              componentParams.AddRange(componentInstance.Params.Input);
              componentParams.AddRange(componentInstance.Params.Output);

              foreach (IGH_Param componentParam in componentParams)
              {
                // Convert Grasshopper param solution data to port solution data
                var portSolutionData = new NodePenPortSolutionData(componentParam.InstanceGuid.ToString());

                // Collect data tree branches and their values
                for (int i = 0; i < componentParam.VolatileData.PathCount; i++)
                {
                  Grasshopper.Kernel.Data.GH_Path currentPath = componentParam.VolatileData.get_Path(i);
                  System.Collections.IList currentBranch = componentParam.VolatileData.get_Branch(currentPath);

                  string branchKey = $"{{{string.Join(";", currentPath.Indices.Select((idx) => idx.ToString()))}}}";

                  NodePenDataTreeBranch branchSolutionData = new NodePenDataTreeBranch()
                  {
                    Order = i,
                    Path = branchKey,
                  };

                  foreach (object entry in currentBranch)
                  {
                    if (!(entry is IGH_Goo goo))
                    {
                      // `goo` appears to be null, not absent, on invalid solutions
                      continue;
                    }

                    var entrySolutionData = Environment.Converter.ConvertToSpeckle(goo);
                    branchSolutionData.Values.Add(entrySolutionData);
                  }

                  portSolutionData.DataTree.Branches.Add(branchSolutionData);
                }

                // Finalize port solution data
                portSolutionData.DataTree.ComputeStats();

                // Add port solution data to node solution data
                nodeSolutionData.PortSolutionData.Add(portSolutionData);
              }

              // Add node solution data to document solution data
              documentSolutionData.NodeSolutionData.Add(nodeSolutionData);

              break;
            }
          default:
            {
              Console.WriteLine($"Unhandled object type [{documentObject.GetType()}]");
              break;
            }
        }
      }

      // Commit updated document and solution data to stream
      string streamId = Environment.SpeckleStreamId;
      string branchName = "main";

      Account account = new Account()
      {
        token = Environment.SpeckleToken,
        serverInfo = new ServerInfo()
        {
          url = Environment.SpeckleEndpoint,
          company = "NodePen"
        },
        userInfo = new UserInfo()
        {
          email = "chuck@nodepen.io"
        }
      };

      var documentStreamData = new NodePenDocumentSpeckleStreamData()
      {
        Document = requestData.Document,
        SolutionData = documentSolutionData,
      };

      string commitId = Helpers.Send(
          stream: $"{Environment.SpeckleEndpoint}/streams/{streamId}/branches/{branchName}",
          data: documentStreamData,
          message: $"Solution [{documentSolutionData.SolutionId}]",
          account: account,
          sourceApplication: "NodePen"
      ).Result;

      Console.WriteLine("Send response value:");
      Console.WriteLine(commitId);

      // Serialize and return response
      Client client = new Client(account);

      var commit = client.CommitGet(streamId, commitId).Result;
      var rootObjectId = commit.referencedObject;

      return Response.AsText(rootObjectId);
    }

    public Response HandleGrasshopperFileUpload(NancyContext context)
    {
      HttpFile file = context.Request.Files.FirstOrDefault();

      if (file == null)
      {
        return Response.AsText("not ok");
      }

      byte[] fileBinary = new byte[file.Value.Length];
      _ = file.Value.Read(fileBinary, 0, (int)file.Value.Length);

      GH_Archive archive = new GH_Archive();
      _ = archive.Deserialize_Binary(fileBinary);

      GH_Document definition = new GH_Document();
      _ = archive.ExtractObject(definition, "Definition");

      NodePenDocument document = NodePenConvert.Serialize(definition);

      return Response.AsJson(document);
    }

    public Response GetGrasshopperConfiguration()
    {
      return Response.AsJson(NodePenConvert.Templates.Where((template) => !template.IsObsolete));
    }

  }

}