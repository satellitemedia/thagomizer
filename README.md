Thagomizer
==========

Check the health status of an HTTP endpoint.

Requirements
------------

This command requires the 
[Apache HTTP server benchmarking tool (ab)](https://httpd.apache.org/docs/current/programs/ab.html).

To install it on Ubuntu/Debian run:

    $ sudo apt-get install apache2-utils

Installation
------------

Install `thagomizer` by running:

    $ npm install -g thagomizer

Usage
-----

Run `thagomizer` to see the available options:

```
Usage:
  thagomizer [OPTIONS] [ARGS]

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
  -e, --expect STRING    A RegExp to check the response against
      --valid STRING     A RegExp to check if the response is valid
  -o, --output FILE      The output file
      --log-level [STRING]The log level (Default is info)
  -h, --help             Display help and usage details

```