import fs from 'fs';
import path from 'path';

import Logger from '@home-gallery/logger'

const log = Logger('server.webapp')

import { useIf, isIndex } from './utils.js'

const injectStateMiddleware = (indexFile, getState, {basePath, injectRemoteConsole}) => {
  return (req, res) => {
    fs.readFile(indexFile, 'utf8', (err, data) => {
      if (err) {
        log.error(err, `Could not read index file ${indexFile}`)
        return res.status(404).json({error: `${err}`});
      }
      if (basePath && basePath != '/') {
        data = data.replace('<base href="/">', `<base href="${basePath}">`)
      }
      if (injectRemoteConsole) {
        data = data.replace('</head>', '<script src="/remote-console.js"></script></head>')
      }
      data = data.replace('window.__homeGallery={}', `window.__homeGallery=${JSON.stringify(getState(req))}`)
      res.set({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache',
        'Content-Length': data.length,
      })
      res.send(data);
    })
  }
}

export const webapp = (webappDir, getState, options) => {
  const indexFile = path.resolve(webappDir, 'index.html')
  const injectState = injectStateMiddleware(indexFile, getState, options)
  return [
    useIf(injectState, isIndex),
    (_, res) => res.sendFile(indexFile)
  ];
}
