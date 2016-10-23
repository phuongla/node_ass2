#!/usr/bin/env babel-node

require('./helper')

const path = require('path')
const fs = require('fs')
const nssocket = require('nssocket')
const request = require('request')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')

const serverPort = 8001

const argv = require('yargs').argv
const rootDir = argv.dir ? argv.dir : path.join(__dirname, 'client_files')

const httpServerUrl = 'http://127.0.0.1:8000/'

function main() {
    const socket = new nssocket.NsSocket({
        reconnect: true,
        type: 'tcp4',
    })

    socket.on('start', async () => {
        console.dir('start connection')
    })

    socket.on('end', async () => {
        console.dir('end connection')
    })

    socket.data(['pageload'], async (data) => {
        const fullPath = path.join(rootDir, data.path)
        if(data.action === 'write') {
            await writeFile(fullPath, data.path)
        } else if(data.action === 'delete') {
            await deleteFile(fullPath)
        }
    })

    socket.connect(serverPort)
}

function getDirDetail(filePath) {
    const endWithSplash = filePath.charAt(filePath.length - 1) === path.sep
    const hasExt = path.extname(filePath) !== ''
    const isDir = endWithSplash || !hasExt
    const dirPath = isDir ? filePath : path.dirname(filePath)
    return { isDir: isDir, dirPath : dirPath }
}

async function deleteFile(filePath) {
    fs.promise.stat(filePath).then(async(stat) => {
        if(stat.isDirectory()) {
            await rimraf.promise(filePath)
        } else {
            await fs.promise.unlink(filePath)
        }
    }).catch(err => {
        console.log(err)
        console.error(`delete file not found: ${filePath}`)
    })
}

async function writeFile(fullPath, filePath) {
    const dirInfo = getDirDetail(fullPath)
    await mkdirp.promise(dirInfo.dirPath)
    if(!dirInfo.isDir) {
        const newFile = `${httpServerUrl}${filePath}`
        const wStream = fs.createWriteStream(fullPath)
        request.get(newFile).pipe(wStream)
    }
}


main()