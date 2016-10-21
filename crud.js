#!/usr/bin/env babel-node

require('./helper')

const path = require('path')
const fs = require('fs').promise
const Promise = require('songbird')
const mime = require('mime-types')
const rootDir = path.join(__dirname, 'files')

async function read(req, res, next) {    
    console.log('read: ' + req.filePath)
    if(res.body) {
        res.json(res.body)
        return
    }
    const rStream = await fs.readFile(req.filePath)    
    res.end(rStream)
}

async function create(req, res) {
    console.log('create')
    res.end()
}

async function sendHeader(req, res, next) {    
    console.log('sendHeader: ' + req.url)
    const filePath = path.resolve(path.join(rootDir, req.url))
    if(filePath.indexOf(rootDir) !== 0) {
        res.send(400, 'Invalid path')
        return
    }
    const stat = await fs.stat(filePath)
    if(stat.isDirectory()) {
        console.log('sendHeader: folder ' + filePath)
        const files = await fs.readdir(filePath)
        res.body = JSON.stringify(files)
        res.setHeader('Content-Length', res.body.length)
        res.setHeader('Content-Type', 'application/json')
        return
    }
    req.stat = stat
    req.filePath = filePath

    console.log('sendHeader: file')
    res.setHeader('Content-Type', stat.size)
    const contentType = mime.contentType(path.extname(filePath))
    res.setHeader('Content-Type', 'application/json')    
}

module.exports = { 
    read, create, sendHeader
}