#!/usr/bin/env babel-node --

require('./helper')

const path = require('path')
const fs = require('fs')
const Promise = require('songbird')
const mime = require('mime-types')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')
const archiver = require('archiver')
const argv = require('yargs').argv


const rootDir = argv.dir ? argv.dir : path.join(__dirname, 'files')
console.log(`root directory: ${rootDir}`)


async function read(req, res, next) {    
    console.log('read: ' + req.filePath)
    if(res.body) {
        res.json(res.body)
        return
    }

    fs.createReadStream(req.filePath, 'utf8').pipe(res)
}

async function create(req, res, next) {
    if(req.stat) {
        return res.status(405).send('File exists')
    }
    console.log('create' + req.filePath)
    await mkdirp.promise(req.dirPath)
    if(!req.isDir) {
        if(req.body && req.body != {}) {
            await fs.promise.writeFile(req.filePath, req.body)
        } else {
            req.pipe(fs.createWriteStream(req.filePath))
        }
    }
    res.end()
    next()
}

async function setMimeType(req, res, next) {
    const filePath = path.resolve(path.join(rootDir, req.url))
    console.log('setMimeType: ' + filePath)
    req.filePath = filePath
    if(filePath.indexOf(rootDir) !== 0) {
        res.status(400).send('Invalid path')
        return
    }
   
    fs.promise.stat(filePath).then(
        (stat) => { 
            req.stat = stat
            next()  
        }, (err) => {
            req.stat = null
            next()
        }
    )
}

async function sendHeaders(req, res, next) {
    if(!req.stat) {
        return res.status(400).send('File is not found')
    }

    if(req.stat.isDirectory()) {
        console.log('sendHeader: folder ' + req.filePath)
        console.log(JSON.stringify(req.headers))

        if(req.headers.accept === 'application/x-gtar') {
            console.log('accepts: application/x-gtar')
            const archive = archiver('zip')
            archive.pipe(res)
            archive.bulk([
                { expand: true, cwd: req.filePath, src:['**'], dest: req.filePath }
            ])
            archive.finalize()
            return
        }

        const files = await fs.promise.readdir(req.filePath)
        res.body = JSON.stringify(files)
        res.setHeader('Content-Length', res.body.length)
        res.setHeader('Content-Type', 'application/json')
        return next()
    }

    console.log('sendHeader: file')
    res.setHeader('Content-Length', req.stat.size)
    const contentType = mime.contentType(path.extname(req.filePath))
    res.setHeader('Content-Type', contentType)
    return next()
}

function setDirDetail(req, res, next) {
    const filePath = req.filePath
    const endWithSplash = filePath.charAt(filePath.length - 1) === path.sep
    const hasExt = path.extname(filePath) !== ''
    req.isDir = endWithSplash || !hasExt
    req.dirPath = req.isDir ? filePath : path.dirname(filePath)
    next()
}

async function del(req, res, next) {
    console.log('del ' + req.filePath)
    if(!req.stat) {
        return res.status(400).send('File is not found')
    }
    if(req.stat.isDirectory()) {
        await rimraf.promise(req.filePath)
    } else {
        await fs.promise.unlink(req.filePath)
    }
    res.end()
    next()
}

async function update(req, res, next) {
    console.log('update' + req.filePath)
    if(!req.stat) {
        return res.status(405).send('File is not exists')
    }
    if(req.stat.isDirectory()) {
        return res.status(405).send('Path is a directory')
    }
    await fs.promise.truncate(req.filePath)
    await fs.promise.writeFile(req.filePath, req.body)
    res.end()
    next()
}

module.exports = { 
    read, create, sendHeaders, setMimeType, setDirDetail, del, rootDir, update
}