'use strict'

const fs = require('fs')
const postcss = require('postcss')
const uglifycss = require('uglifycss')
const gzipSize = require('gzip-size')
const glob = require('glob')

function processFile(css, opts) {
  return new Promise((resolve, reject) => {
    const htmlComment = opts.htmlComment || 'cssential'
    const cssComment = opts.cssComment || '!cssential'
    const removeOriginal = opts.removeOriginal !== false

    let criticalCss = processNode(css, cssComment, htmlComment)

    // Minifying inline CSS
    criticalCss = uglifycss.processString(criticalCss)

    const regexPattern = '<!--' + htmlComment + '-->'
                       + '(.*?)'
                       + '<!--\/' + htmlComment + '-->'

    const regex = new RegExp(regexPattern, 'g')
    
    const inlineStyle = '<!--' + htmlComment + '-->'
                      + '<style>' + criticalCss + '</style>'
                      + '<!--/' + htmlComment + '-->'

    const inlineStyleSize = gzipSize.sync(inlineStyle)

    glob(opts.output, {}, (globError, files) => {
      if (globError) {
        return reject(globError)
      }

      let filesRead = 0

      files.forEach(function (file, index, arr) {
        fs.readFile(file, 'utf8', function (fileError, data) {
          if (fileError) {
            return reject(fileError)
          }

          const newFile = data.replace(regex, inlineStyle)

          fs.writeFile(file, newFile, function (err) {
            if (err) {
              return reject(err)
            }

            if (++filesRead === files.length) {
              return resolve({
                files: files.length,
                size: inlineStyleSize
              })              
            }
          })
        })
      })
    }) 
  })
}

function processNode(node, cssComment, removeOriginal) {
  let output = ''
  let atRules = {}

  node.walkComments(function (node) {
    if (node.text !== cssComment) {
      return
    }

    let parent = node.parent

    // Remove comment
    node.remove()

    if (parent.parent.type === 'atrule') {
      atRules[parent.parent.name + ' ' + parent.parent.params] = atRules[parent.parent.name + ' ' + parent.parent.params] || []
      atRules[parent.parent.name + ' ' + parent.parent.params].push(parent.toString())
    } else {
      output += parent.toString()
    }

    if (removeOriginal) {
      if (parent.parent.nodes.length === 1) {
        parent.parent.remove()
      } else {
        parent.remove()
      }
    }
  })

  Object.keys(atRules).forEach(atRule => {
    output += '@' + atRule + '{' + atRules[atRule] + '}'
  })

  return output
}

module.exports = postcss.plugin('cssential', (opts) => {
  opts = opts || {}

  return (css, result) => {
    return processFile(css, opts).then(output => {
      console.log('[CSSential] Inline CSS injected to ' + output.files + ' files (' + output.size + 'b gzipped)');
    }).catch(error => {
      console.log('[CSSential] (!) ERROR: ' + error)
    })   
  }
})
