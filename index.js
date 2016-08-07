//Add pretty texts
var chalk       = require('chalk');
var clear       = require('clear');
var CLI         = require('clui');
var figlet      = require('figlet');
var inquirer    = require('inquirer');
var Spinner     = CLI.Spinner;
var Preferences = require('preferences');
var files = require('./lib/files');
var GitHubApi   = require('github');
var _           = require('lodash');
var git         = require('simple-git')();
var touch       = require('touch');
var fs          = require('fs');

//Making it globally
var github = new GitHubApi({
    version: '3.0.0'
});

//Clear the screen and add a pretty Text at the top
clear();
console.log(
    chalk.red(
        figlet.textSync('Ginit', { horizontalLayout: 'full' })
    )
);

//Checks if a git folder already exist in the folder
if (files.directoryExists('.git')) {
    console.log(chalk.green('Already a git repository!'));
    process.exit();
}

//Function to get git credentials
function getGithubCredentials(callback) {
    var questions = [
        {
            name: 'username',
            type: 'input',
            message: 'Enter your Github username or e-mail address:',
            validate: function( value ) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter your username or e-mail address';
                }
            }
        },
        {
            name: 'password',
            type: 'password',
            message: 'Enter your password:',
            validate: function(value) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter your password';
                }
            }
        }
    ];

    inquirer.prompt(questions).then(callback);
}

//Checks if we have an access token
function getGithubToken(callback) {
    //Use to store encryted password
//On Mac OSX/Linux, you’ll find the file in /Users/[YOUR-USERNME]/.config/preferences/ginit.pref
    var prefs = new Preferences('ginit');

    if (prefs.github && prefs.github.token) {
        return callback(null, prefs.github.token);
    }

    // Fetch token
    getGithubCredentials(function(credentials) {
        var status = new Spinner('Authenticating you, please wait...');
        status.start();

        github.authenticate(
            _.extend(
                {
                    type: 'basic',
                },
                credentials
            )
        );

        github.authorization.create({
            scopes: ['user', 'public_repo', 'repo', 'repo:status'],
            note: 'ginit, the command-line tool for initalizing Git repos'
        }, function(err, res) {
            status.stop();
            if ( err ) {
                return callback( err );
            }
            if (res.token) {
                prefs.github = {
                    token : res.token
                };
                return callback(null, res.token);
            }
            return callback();
        });
    });
}


getGithubToken(function(){
    console.log("Login Successfull!");
    console.log(arguments);
    createRepo(function(){
       console.log("Repo created!");
        console.log(arguments);
    });
});




function createRepo(callback) {
    var argv = require('minimist')(process.argv.slice(2));

    var questions = [
        {
            type: 'input',
            name: 'name',
            message: 'Enter a name for the repository:',
            default: argv._[0] || files.getCurrentDirectoryBase(),
            validate: function( value ) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter a name for the repository';
                }
            }
        },
        {
            type: 'input',
            name: 'description',
            default: argv._[1] || null,
            message: 'Optionally enter a description of the repository:'
        },
        {
            type: 'list',
            name: 'visibility',
            message: 'Public or private:',
            choices: [ 'public', 'private' ],
            default: 'public'
        }
    ];

    inquirer.prompt(questions).then(function(answers) {
        var status = new Spinner('Creating repository...');
        status.start();

        var data = {
            name : answers.name,
            description : answers.description,
            private : (answers.visibility === 'private')
        };

        github.repos.create(
            data,
            function(err, res) {
                status.stop();
                if (err) {
                    return callback(err);
                }
                return callback(null, res.ssh_url);
            }
        );
    });
}
