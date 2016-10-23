#!/usr/bin/env babel-node

require('./helper')

const path = require('path')
const fs = require('fs').promise
const express = require('express')
const morgan = require('morgan')
const crud = require('./crud')
const bodyParser = require('body-parser')
const nssocket = require('nssocket')
const chokidar = require('chokidar')

const app = express()
const port = 8000

const socketPort = 8001

let clientConnected


function main() {

    app.use(morgan('dev'))

    app.get('*', crud.setMimeType, async (req, res, next) => {
        await crud.sendHeaders(req, res, next)       
    }, async (req, res) => {
        await crud.read(req, res)        
    })
    
    app.head('*', crud.setMimeType, async (req, res, next) => {
        await crud.sendHeaders(req, res, next)
        next()
    }, (req, res) => {
        res.end()
    })
    
    app.put('*', bodyParser.raw({type:'*/*'}), crud.setMimeType, crud.setDirDetail, crud.create)
    
    app.post('*', bodyParser.raw({type:'*/*'}), crud.setMimeType, crud.setDirDetail, crud.update)

    app.delete('*', crud.setMimeType, crud.setDirDetail, crud.del)

    app.listen(port, () => {
        console.log(`HTTP LISTENING @ http://127.0.0.1:${port}`)
    })


    const server = nssocket.createServer(
        async (socket) => {
            clientConnected = socket
            console.log('client connected')
        }
    )
    server.listen(socketPort, () => {
        console.log(`SOCKET SERVER LISTENING 127.0.0.1:${socketPort}`)
    })

    chokidar.watch(crud.rootDir, {ignored: /[\/\\]\./})
    .on('all', async (event, path) => {
        await changeHandlerAuto(event, path)
    })

}

main()

async function changeHandler(req, res) {
    if(!clientConnected) {
        return
    }

    const pageload = {
        type: req.isDir ? 'dir' : 'file',
        path: req.url,
        updated: Date.now()
    }
    if(req.method === 'PUT' || req.method === 'POST') {
        pageload.action = 'write'
    } else if(req.method === 'DELETE') {
        pageload.action = 'delete'
    }

    clientConnected.send(['pageload'], pageload)
}

function getDirDetail(filePath) {
    const endWithSplash = filePath.charAt(filePath.length - 1) === path.sep
    const hasExt = path.extname(filePath) !== ''
    const isDir = endWithSplash || !hasExt
    const dirPath = isDir ? filePath : path.dirname(filePath)
    return { isDir: isDir, dirPath : dirPath }
}

function parseAbsoluteUrlToRelativeUrl(path) {
    const idx = path.indexOf(crud.rootDir)
    if(idx >= 0) {
        return path.substr(idx + crud.rootDir.length, path.length)
    }
    return path
}

async function changeHandlerAuto(type, path) {
    
    if(!clientConnected) {
        return
    }

    const dirInfo = getDirDetail(path)
    const rUrl = parseAbsoluteUrlToRelativeUrl(path)
 
    const pageload = {
        type: dirInfo.isDir ? 'dir' : 'file',
        path: rUrl,
        updated: Date.now()
    }
    if(type === 'add' || type === 'change') {
        pageload.action = 'write'
    } else if(type === 'unlink') {
        pageload.action = 'delete'
    }

    clientConnected.send(['pageload'], pageload)
}


