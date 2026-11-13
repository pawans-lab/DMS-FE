/** Port of `macro filetype(ext)` in _macros.html. */
export default function FileTypeBadge({ ext }) {
  const e = (ext || '').toLowerCase()
  let cls = 'txt'
  if (e === 'pdf') cls = 'pdf'
  else if (['doc', 'docx', 'odt', 'rtf'].includes(e)) cls = 'doc'
  else if (['xls', 'xlsx', 'ods', 'csv'].includes(e)) cls = 'xls'
  else if (['ppt', 'pptx', 'odp'].includes(e)) cls = 'ppt'
  else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff'].includes(e)) cls = 'img'
  return <span className={`ft ft-${cls}`}>{(e || 'file').slice(0, 4).toUpperCase()}</span>
}
