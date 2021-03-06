# SAFE Wiki

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## About

### Attribution

SAFE Wiki is based upon the efforts of the [Kiwix](http://www.kiwix.org/) project. More specifically [Kiwix JS](https://github.com/kiwix/kiwix-js), from which a large portion of SAFE Wiki is based upon. A big thank you to everyone who has contributed to the Kiwix Project.

Please note that SAFE Wiki is not endorsed by or associated with the Kiwix project.

### The SAFE Network

[SAFE Network](https://safenetwork.org/), **S**ecure **A**ccess **F**or **E**veryone.

`
The SAFE Network is a decentralized data storage and communications network that provides a secure, efficient
and low-cost infrastructure for everyone.
`

### SAFE Wiki

The goal of this project is to allow you to access educational content that is hosted on a distributed, censorship resistant and [autonomous](https://blog.maidsafe.net/2017/10/07/autonomous-data-networks-and-why-the-world-needs-them/) network. Whether this be [Wikipedia](https://www.wikipedia.org), [WikiSpecies](https://species.wikimedia.org/wiki/Main_Page) or even [TED Talks](https://www.ted.com/). This would mean that even if you didn't have access to these resources (perhaps government censorship) as long as you have access to the SAFE Network you would be able to access them freely.

SAFE Wiki facilitates the storage of [ZIM](http://www.openzim.org/wiki/OpenZIM) files on the SAFE Network. After a user uploads a ZIM file to the safe network any other user can browse that file. SAFE Wiki facilitates this while maintaining the full functionality of Kiwix JS.

## Installation

To run SAFE Wiki, you will need:

- [Node.js](https://nodejs.org) `v8.x`, I recommend using [NVM](https://github.com/creationix/nvm)
- [Yarn](https://yarnpkg.com/) package manager
- [Electron](http://electron.atom.io/)

I reccomend installing Electron via:

    $ yarn global add electron
    
**Before doing any of the next steps**, as a bare minimum please run...

    $ yarn
    
... from the top level folder of this project. Please consult the **Mock Routing** section if you intend to use it!

### Mock Routing

Similar to other Node powered SAFE applications, if you wish to use mock routing then you need to set `NODE_ENV=dev`.

    $ export NODE_ENV=dev
    
If you enter that command before running `yarn` you should be all set.
    
You could also choose to prefix each command with `NODE_ENV=dev` if you so desire.

### Run in development mode

    $ yarn start
    
SAFE Wiki should then start!

### Package SAFE Wiki

    $ yarn package
    
This will create a binary/app/etc for your current OS in a folder called `out`. Please note this has only been tested on macOS, if there are any issues with other operating systems I will fix them as I become aware of them.

If you would then like to further 'package' the application, run:

    $ yarn make
    
In the instance of macOS, this will zip the application for you.
## License

[GPLv3](https://github.com/DaBrown95/safe-wiki/blob/master/LICENSE)