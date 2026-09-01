import metadata from './application.json'
import packageMetadata from '../../package.json'
interface ApplicationMetadata {
 name: string
 version: string
 modelScope: string
 releaseDate: string
}
if (metadata.version !== packageMetadata.version) {
 throw new Error(`Uygulama sürümü (${metadata.version}) package sürümüyle (${packageMetadata.version})eşleşmiyor.`)
}
export const APPLICATION_METADATA = metadata satisfies ApplicationMetadata
