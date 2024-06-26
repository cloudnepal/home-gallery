import Logger from '@home-gallery/logger'

const log = Logger('extractor.image.rawPreviewExif')

import { toPipe, conditionalTask } from '../../stream/task.js'

const rawPreviewSuffix = 'raw-preview.jpg'
const rawPreviewExifSuffix = 'raw-preview-exif.json'

export const rawPreviewExif = (storage, {exiftool}) => {
  const test = entry => storage.hasEntryFile(entry, rawPreviewSuffix) && !storage.hasEntryFile(entry, rawPreviewExifSuffix)

  const task = (entry, cb) => {
    const t0 = Date.now()
    exiftool.read(storage.getEntryFilename(entry, rawPreviewSuffix))
      .then(tags => {
        storage.writeEntryFile(entry, rawPreviewExifSuffix, JSON.stringify(tags), (err) => {
          if (err) {
            log.error(err, `Could not write exif meta data of raw preview image for ${entry}: ${err}`)
            return cb()
          }
          log.debug(t0, `Read exif meta data of raw preview from ${entry}`)
          cb()
        })
      })
      .catch(err => {
        log.warn(err, `Could not read exif meta data of raw preview image of ${entry}: ${err}`)
        cb()
      })
  }

  return toPipe(conditionalTask(test, task))
}
