import webvtt from 'webvtt-parser'

export default ({ Router }) => {
  Router.on('/', async ({ url }) => {
    const vtt_url = url.search.startsWith('?https')
      ? decodeURIComponent(url.search.slice(1))
      : '/Luis Fonsi - Despacito ft. Daddy Yankee-kJQP7kiw5Fk.es.vtt'

    const short = url.search.startsWith('?short')

    let tree
    try {
      const contents = await (await fetch(vtt_url)).text()
      const parser = new webvtt.WebVTTParser()
      tree = parser.parse(contents)
    } catch (e) {
      const error = JSON.stringify(e, null, 2)
      const message = `ERROR: couldn't parse WebVTT file at '${vtt_url}'\nGot message:\n${error}`
      return new Response(message, { status: 500 })
    }

    const cues = tree.cues
      .map(cue => ({
        startTime: cue.startTime,
        text: cue.text.replace(/♪|\n/g, ' ').trim()
      }))
      .filter(cue => cue.text)

    const [first_cue, ...rest] = short ? cues.slice(0, 10) : cues

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(first_cue.text + '\n')
        rest.forEach((cue, i) => {
          setTimeout(() => {
            controller.enqueue(cue.text + '\n')
            if (i === rest.length - 1) controller.close()
          }, 1000 * (cue.startTime - first_cue.startTime))
        })
      }
    })

    return new Response(stream, {
      headers: {
        'content-type': 'text/plain',
        'Transfer-Encoding': 'chunked'
      }
    })
  })
}
