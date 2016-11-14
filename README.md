Thagomizer
==========

Check the health status of an HTTP endpoint.

[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

Requirements
------------

This command requires the 
[Apache HTTP server benchmarking tool (ab)](https://httpd.apache.org/docs/current/programs/ab.html).

**To install it on Ubuntu/Debian run:**

    $ sudo apt-get install apache2-utils

Because of a naming conflict with an existing package, on Ubuntu the Node.js executable is called `nodejs` by default
and this will prevent any Node.js command from working. A quick workaround is to run the following:

    $ sudo ln -s `which nodejs` /usr/bin/node

**On Amazon / Redhat Linux derivatives:**

    $ sudo yum install httpd-tools

Then find some way to put a recent enough version of nodejs on there (6+)

    $ sudo curl --silent --location https://rpm.nodesource.com/setup_6.x | bash -


Installation
------------

Install `thagomizer` by running:

    $ npm install -g thagomizer

Usage
-----

Run `thagomizer` to see the available options:

```
Usage:
  thagomizer [OPTIONS]

Options: 
  -c, --clients [NUMBER] The number of concurrent clients, defaults to 1  (Default is 1)
  -t, --tries [NUMBER]   The number of tries per client, defaults to 10, max 
                         10000  (Default is 10)
  -d, --delay NUMBER     Repeats the check after the delay in seconds, 
                         requires --until 
  -u, --until STRING     Halt the script when the time is reached
      --post STRING      Content of the post request, placeholders for CSV 
                         input are in the form: %index% 
      --post-type [STRING]Content type of the data (Default is application/x-www-form-urlencoded)
  -U, --url STRING       The URL to hit, placeholders for CSV input are in the 
                         form: %index% 
      --headers STRING   Headers to send
      --tests FILE       CSV file with test data, requires --post
      --skip NUMBER      Number of tests to skip
  -e, --expect STRING    A RegExp to check the response against
      --valid STRING     A RegExp to check if the response is valid
  -o, --output FILE      The output file
      --persistent BOOLEANUse persistent connections
      --log-level [STRING]The log level (Default is info)
  -v, --version          Display the current version
  -h, --help             Display help and usage details
```
