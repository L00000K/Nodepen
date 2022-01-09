import Queue from 'bee-queue'
import { admin } from '../../firebase'
import { uploadFile } from '../../firebase/utils'
import { scene, encoding } from '../../three'
import { v4 as uuid } from 'uuid'
import jimp from 'jimp'
import fs from 'fs'
import { NodePen } from 'glib'

type RenderThumbnailImageQueueJobData = {
  graphId: string
  solutionId: string
  revision: string
  graphJson: string // json string of nodepen graph elements
  graphBinaries: string // base64 string of bytearray
  graphSolution: string // json string of solution geometry and messages
  graphName: string
  authorName: string
}

export const processJob = async (
  job: Queue.Job<RenderThumbnailImageQueueJobData>
): Promise<unknown> => {
  const {
    graphId,
    solutionId,
    graphBinaries,
    graphJson,
    graphSolution,
    revision,
    graphName,
    authorName,
  } = job.data

  const jobId = job.id.padStart(4, '0')
  const jobLabel = `[ JOB ${jobId} ] [ RQ:THUMBNAIL ]`

  console.log(`${jobLabel} [ START ]`)

  fs.mkdirSync(`./temp/social/${solutionId}`, { recursive: true })

  const bucket = admin.storage().bucket('np-graphs')
  const pathRoot = `${graphId}/${solutionId}`

  const graph: NodePen.GraphElementsArray = JSON.parse(graphJson ?? '[]')
  const solution: NodePen.SolutionManifest = JSON.parse(graphSolution ?? '{}')

  if (graph.length === 0 || !solution.data) {
    console.log(`${jobLabel} [ SKIP ] No data available for render.`)
    return job.data
  }

  // Begin creating thumbnails
  const model = await scene.createScene(graph, solution)
  const camera = scene.getThumbnailCamera()

  scene.setCameraOrbit(camera, -135)

  const renderer = new encoding.Renderer()
  const image = encoding.toPNG(model, camera, renderer.getRenderer())

  // Write to storage
  const imageStream = fs.createWriteStream(
    `./temp/social/${solutionId}/twitter-frame.png`
  )
  image.pack().pipe(imageStream, { end: true })

  await new Promise<void>((resolve) => {
    const handleResolve = () => {
      resolve()
    }

    imageStream.on('finish', handleResolve)
    imageStream.on('close', handleResolve)
    imageStream.on('error', (e) => {
      console.log(e)
      handleResolve()
    })
  })

  const thumbnailFilePath = `${pathRoot}/${uuid()}.png`
  const thumbnailFileData = fs.readFileSync(
    `./temp/social/${solutionId}/twitter-frame.png`
  )
  const thumbnailRef = await uploadFile(
    bucket,
    thumbnailFilePath,
    thumbnailFileData
  )

  // Create opengraph link preview
  const barlowBold = await jimp.loadFont('./fonts/Barlow-Bold.fnt')
  const barlowMedium = await jimp.loadFont('./fonts/Barlow-Medium.fnt')

  const card = await jimp.read('./img/np-thumb-bg.png')
  card.print(barlowBold, 509, 35, graphName, 225)

  const h = jimp.measureTextHeight(barlowBold, graphName, 225)
  card.print(barlowMedium, 509, 35 + h + 6, `by ${authorName}`, 225)

  const thumb = await jimp.read(`./temp/social/${solutionId}/twitter-frame.png`)

  const base = new jimp(750, 375, '#EFF2F2')
  base.blit(thumb, 37, 37)
  base.blit(card, 0, 0)

  const socialsBucket = admin.storage().bucket('np-thumbnails')
  const twitterThumbnailImagePath = `${graphId}/twitter.png`
  const twitterThumbnailImageData = await base.getBufferAsync('image/png')

  const twitterThumbnailImagRef = await uploadFile(
    socialsBucket,
    twitterThumbnailImagePath,
    twitterThumbnailImageData,
    -1
  )

  // Update firestore record with the thumbnail's location
  const revisionRef = admin
    .firestore()
    .collection('graphs')
    .doc(graphId)
    .collection('revisions')
    .doc(revision.toString())
  const revisionDoc = await revisionRef.get()

  if (!revisionDoc.exists) {
    console.error(
      `${jobLabel} [ ERROR ] Failed to update revision doc because it does not exist.`
    )
  } else {
    await revisionRef.update(
      'files.thumbnailImage',
      thumbnailRef,
      'files.twitterThumbnailImage',
      twitterThumbnailImagRef
    )
  }

  // Cleanup
  renderer.destroy()
  model.clear()

  fs.rmSync(`./temp/social/${solutionId}/twitter-frame.png`)

  return job.data
}
