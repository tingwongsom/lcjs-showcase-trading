const fs = require('fs')
const showdown = require('showdown')
const buildOutput = 'dist'

const build = function () {
    return new Promise(( resolve, reject ) => {
        // Convert showcase description markdown to HTML understandable format, and include in build.
        const source = "./README.md"
        fs.readFile( source, (err, buffer) => {
            if ( err )
                reject( err )
            
            let md = buffer.toString()
            // Filter everything out except "Description" chapter.
            // TODO
        
            const converter = new showdown.Converter()
            converter.setFlavor( 'github' )
            const htmlMd = converter.makeHtml( md )
        
            // Write to build output.
            const target = `${buildOutput}/${source}`
            fs.writeFile( target, htmlMd, (err) => {
                if ( err )
                    reject( err )
                resolve()
            })
        })
    })
}

exports.build = build
