module.exports = (grunt) ->
    # Project configuration:
    grunt.initConfig
        pkg: require './package.json'
        yuidoc:
            compile:
                name: '<%= pkg.name %>'
                description: '<%= pkg.description %>'
                version: '<%= pkg.version %>'
                url: '<%= pkg.homepage %>'
                options:
                    paths: '.'
                    outdir: 'release/doc'
        uglify:
            files:
                'release/viewjs-0.2.1.min.js': ['view.js']
            options:
                compress: yes
                mangle: false
                banner: '/**\n' +
                        ' * <%= pkg.name %> v<%= pkg.version %> (<%= grunt.template.today("yyyy-mm-dd") %>)\n' +
                        ' * Copyright (c) <%= grunt.template.today("yyyy") %>, <%= pkg.author %>\n' +
                        ' * Released under the <%= pkg.license %> license\n' +
                        ' */\n'
    # Load plugins:
    grunt.loadNpmTasks 'grunt-contrib-yuidoc'
    grunt.loadNpmTasks 'grunt-contrib-uglify'
    # Register tasks:
    grunt.registerTask 'release-doc', ['yuidoc']
    grunt.registerTask 'release-js', ['uglify']
    grunt.registerTask 'release', ['release-doc', 'release-js']
    grunt.registerTask 'default', ['release']
