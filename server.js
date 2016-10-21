#!/usr/bin/env babel-node

require('./helper')

const path = require('path')
const fs = require('fs').promise
const express = require('express')
const morgan = require('morgan')
const crud = require('./crud')

const app = express()
const port = 8000

function main() {

    app.use(morgan('dev'))

    app.get('*', async (req, res, next) => {
        await crud.sendHeader(req, res, next)
        next()        
    }
    , async (req, res, next) => {
        await crud.read(req, res, next)        
    })


    app.listen(port, () => {
        console.log(`LISTENING @ http://127.0.0.1:${port}`)
    })
}

main()

function errorHandler(err) {
    console.log(err.code + " : " + err.message)
}


