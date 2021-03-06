'use strict';

// colors for terminal
require('colors');

// utility, lodash
const _ = require( 'lodash' );
_.mixin( require( 'underscore.string' ).exports() );

module.exports = grunt => {
    // Hide 'Running task' text from grunt output
    grunt.log.header = () => {};

    // Initial config
    const config = {
        // Read JSON files
        pkg: grunt.file.readJSON( 'package.json' ),
        backgrounds: grunt.file.readJSON( 'backgrounds.json' )
    };

    const humanized = config.pkg.humanized;

    // General purpose functions.
    const share = (key, data) => {
            // tasks can share anything into grunt.config:
            grunt.registerTask( '__taskshare', '', () => grunt.config( key, data ) );
            grunt.task.run( '__taskshare' );
        },
        header = (msg, before) => {
            !before || grunt.log.write( '\n' + before.bold );
            const d = _('-').repeat( 77 );
            grunt.log.subhead( d + '\n' + msg.grey + '\n' + d );
        },
        generating = msg => grunt.log.subhead( 'Generating ' + msg + '...' ),
        defaultOr = (name, base, ext) =>
            (name === 'default' ? base : base + ' - ' + _.capitalize( name )) + (ext || '');

    // Tasks options
    var tasks = {
        bump: {
            options: {
                files: ['package.json'],
                updateConfigs: ['pkg'],
                commit: true,
                commitMessage: 'Release v%VERSION%',
                commitFiles: ['package.json'],
                createTag: true,
                tagName: 'v%VERSION%',
                tagMessage: 'Version %VERSION%',
                push: true,
                pushTo: 'origin',
                gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
                globalReplace: false
            }
        },
        clean: ['*.tmTheme'],
        copy: { colorschemes: { files: [{
            expand: true,
            flatten: true,
            cwd: 'templates',
            src: ['template.hidden-tmTheme'],
            rename: () => grunt.config( 'renamer' )( '.tmTheme' )
        }]}},
        replace: { colorschemes: {
            overwrite: true,
            replacements: [
                { from: '{{name}}',   to: '<%= renamer() %>' },
                { from: '{{bg_rgb}}', to: '<%= bg.rgb %>' },
                { from: '{{bg_hex}}', to: '<%= bg.hex %>' }
            ]
        }},
        verbosity: { hidden: { tasks: ['copy', 'clean'] } }
    };

    // Merge tasks options with config
    _.merge( config, tasks );

    require( 'load-grunt-tasks' )( grunt );

    // Define grunt tasks:
    grunt.registerTask( 'default', [] );

    // Build task:
    // ColorSchemes task:
    grunt.registerTask( 'build', 'Build custom themes', () => {
        header( 'Current version: ' + grunt.config( 'pkg.version' ) + '\n' +
            'Github repository: https://github.com/centril/' + grunt.config( 'pkg.name' ),
            humanized + ' Builder' );

        grunt.task.run( ['verbosity', 'clean'] );

        header( 'Building theme files' );

        grunt.config( 'backgrounds').forEach( bg => {
            generating( bg.name + ' variation' );
            const renamer = _.partial( defaultOr, bg.name, humanized );
            share( 'renamer', renamer );
            share( 'bg', bg );
            share( 'replace.colorschemes.src', [renamer( '.tmTheme' )] );
            grunt.task.run( ['copy:colorschemes', 'replace:colorschemes'] );
        });
    });

    // Load grunt config
    grunt.initConfig( config );

    // Load all npm tasks at once
    require( 'matchdep' ).filterDev( 'grunt-*' ).forEach( grunt.loadNpmTasks );
};
