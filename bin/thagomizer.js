#!/usr/bin/env node

const HttpCheck = require('../thagomizer').HttpCheck,
    check = new HttpCheck();

check.run();