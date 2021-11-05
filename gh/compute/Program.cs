﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Nancy;
using Nancy.Bootstrapper;
using Nancy.Conventions;
using Nancy.Extensions;
using Nancy.Hosting.Self;
using Nancy.Routing;
using Nancy.TinyIoc;
using Serilog;
using Topshelf;
// using Microsoft.Web.WebView2.Wpf;

namespace NodePen.Compute
{
  class Program
  {
    public static IDisposable RhinoCore { get; set; }

    static void Main(string[] args)
    {
      RhinoInside.Resolver.Initialize();
#if DEBUG
            string rhinoSystemDir = @"C:\dev\github\mcneel\rhino\src4\bin\Debug";
            if (System.IO.Directory.Exists(rhinoSystemDir))
                RhinoInside.Resolver.RhinoSystemDirectory = rhinoSystemDir;
#endif

      Logging.Init();
      int backendPort = 9900;

      Topshelf.HostFactory.Run(x =>
      {
        x.UseSerilog();
        x.ApplyCommandLine();
        x.SetStartTimeout(new TimeSpan(0, 1, 0));
        x.Service<NancySelfHost>(s =>
                {
                  s.ConstructUsing(name => new NancySelfHost());
                  s.WhenStarted(tc => tc.Start(backendPort));
                  s.WhenStopped(tc => tc.Stop());
                });
        x.RunAsPrompt();
        //x.RunAsLocalService();
        x.SetDisplayName("compute.geometry");
        x.SetServiceName("compute.geometry");
      });

      if (RhinoCore != null)
        RhinoCore.Dispose();
    }
  }

  public class NancySelfHost
  {
    private NancyHost _nancyHost;
    private System.Diagnostics.Process _backendProcess = null;

    public void Start(int http_port)
    {
      Log.Information("Launching RhinoCore library as {User}", Environment.UserName);
      Program.RhinoCore = new Rhino.Runtime.InProcess.RhinoCore(null, Rhino.Runtime.InProcess.WindowStyle.NoWindow);

      Environment.SetEnvironmentVariable("RHINO_TOKEN", null, EnvironmentVariableTarget.Process);

      var config = new HostConfiguration();

      config.RewriteLocalhost = true;

      var listenUriList = new List<Uri>();

      if (http_port > 0)
        listenUriList.Add(new Uri($"http://localhost:{http_port}"));

      if (listenUriList.Count > 0)
        _nancyHost = new NancyHost(config, listenUriList.ToArray());
      else
        Log.Error("Neither COMPUTE_HTTP_PORT nor COMPUTE_HTTPS_PORT are set. Not listening!");
      try
      {
        _nancyHost.Start();
        foreach (var uri in listenUriList)
          Log.Information("compute.geometry running on {Uri}", uri.OriginalString);
      }
      catch (AutomaticUrlReservationCreationFailureException)
      {
        Log.Error(GetAutomaticUrlReservationCreationFailureExceptionMessage(listenUriList));
        Environment.Exit(1);
      }
    }

    // TODO: move this somewhere else
    string GetAutomaticUrlReservationCreationFailureExceptionMessage(List<Uri> listenUriList)
    {
      var msg = new StringBuilder();
      msg.AppendLine("Url not reserved. From an elevated command promt, run:");
      msg.AppendLine();
      foreach (var uri in listenUriList)
        msg.AppendLine($"netsh http add urlacl url=\"{uri.Scheme}://+:{uri.Port}/\" user=\"Everyone\"");
      return msg.ToString();
    }

    public void Stop()
    {
      if (_backendProcess != null)
        _backendProcess.Kill();
      _nancyHost.Stop();
    }
  }

  public class Bootstrapper : Nancy.DefaultNancyBootstrapper
  {
    private byte[] _favicon;

    protected override void RequestStartup(TinyIoCContainer container, IPipelines pipelines, NancyContext context)
    {
#if DEBUG
            //CORS Enable
            pipelines.AfterRequest.AddItemToEndOfPipeline((ctx) =>
            {
                ctx.Response.WithHeader("Access-Control-Allow-Origin", "*")
                                .WithHeader("Access-Control-Allow-Methods", "POST,GET")
                                .WithHeader("Access-Control-Allow-Headers", "Accept, Origin, Content-type");

            });
#endif
    }

    protected override void ApplicationStartup(TinyIoCContainer container, IPipelines pipelines)
    {
      Log.Debug("ApplicationStartup");

      // Load GH at startup so it can get initialized on the main thread
      var pluginObject = Rhino.RhinoApp.GetPlugInObject("Grasshopper");
      var runheadless = pluginObject?.GetType().GetMethod("RunHeadless");
      if (runheadless != null)
        runheadless.Invoke(pluginObject, null);

      // var loadComputePlugsin = typeof(Rhino.PlugIns.PlugIn).GetMethod("LoadComputeExtensionPlugins");
      // if (loadComputePlugsin != null)
      //    loadComputePlugsin.Invoke(null, null);

      Nancy.StaticConfiguration.DisableErrorTraces = false;
      pipelines.OnError += (ctx, ex) => LogError(ctx, ex);
      base.ApplicationStartup(container, pipelines);
    }

    protected override void ConfigureConventions(NancyConventions nancyConventions)
    {
      base.ConfigureConventions(nancyConventions);
      nancyConventions.StaticContentsConventions.Add(StaticContentConventionBuilder.AddDirectory("docs"));
    }

    protected override byte[] FavIcon
    {
      get { return _favicon ?? (_favicon = LoadFavIcon()); }
    }

    private byte[] LoadFavIcon()
    {
      using (var resourceStream = GetType().Assembly.GetManifestResourceStream("NodePen.Compute.favicon.ico"))
      {
        var memoryStream = new System.IO.MemoryStream();
        resourceStream.CopyTo(memoryStream);
        return memoryStream.GetBuffer();
      }
    }

    private static dynamic LogError(NancyContext ctx, Exception ex)
    {
      string id = ctx.Request.Headers["X-Compute-Id"].FirstOrDefault();
      Log.Error(ex, "An exception occured while processing request \"{RequestId}\"", id);
      return null;
    }
  }
}
