const fs = require("fs");

module.exports = class WordpressWebpackPluginVersionSync {

    static defaultOptions = {
        configFile: false,
        outputFile: false,
        replacements: {
            '{VERSION}': process.env.npm_package_version
        },
        addNewlineAfter: false
    }

    constructor( options = {} ) {
        this.options = { ...WordpressWebpackPluginVersionSync.defaultOptions, ...options };
    }

    apply( compiler ) {
        const pluginName = WordpressWebpackPluginVersionSync.name;

        // Verify that the plugin has the required parameters
        if( ! this.options.outputFile ) throw new Error( `Error: ${pluginName} requires an \`outputFile\` in order to write synced content.` );
        if( ! this.options.configFile ) throw new Error( `Error: ${pluginName} requires a \`configFile\` in order to generate synced content.`);

        compiler.hooks.afterEmit.tapAsync( pluginName, ( compilation, callback ) => {
                // Read the current outputFile content
                const outputFileContents = fs.readFileSync( this.options.outputFile, { encoding: 'utf-8' } );
                const search = /\/\*\*([\s\S]*?)\*\//;
                
                // Generate the header content for the plugin `outputFile`
                let { output, config } = this.generatePluginHeaderOutput();

                // Replace the existing file header and write the new file.
                let outputContent = outputFileContents.replace( search, output );
                fs.writeFileSync( this.options.outputFile, outputContent );

                // Log write success
                console.log( `${config['Plugin Name']}: File Header Updated` );

                // Run any async callback assigned to the compiler
                callback();
            }
        );
    }

    /**
     * Generate the header output for the WordPress plugin.
     * @returns { Object } An object containing the generated output and the plugin's parsed config object.
     */
    generatePluginHeaderOutput() {
        const config = require( this.options.configFile );
        const configKeys = Object.keys( config );
        const usePHPDocBlock = configKeys.includes( '@wordpress-plugin' ) ? true : false;

        // Open the output with a PHP DocBlock comment opener
        let output = "/**\n";

        // Add plugin name to top of DocBlock if we're using PHPDoc 
        // DocBlock style commenting.
        if( usePHPDocBlock ) {
            output += ` * ${config['Plugin Name']}\n`;
            output += ` *\n`;
        }

        // Loop through config options and assign them to the
        // DocBlock header.
        for( var i in config ) {

            // Handle replacing any assigned parameters from `config`.
            // Additional parameters can be assigned by adding them to
            // the `replacements` onject in the plugin options.
            const replacements = Object.keys( this.options.replacements );
            if( replacements.includes( config[i] ) ) {
                config[i] = this.options.replacements[ config[i] ];
            }

            switch( i ) {
                case '@wordpress-plugin':
                    output += ` *\n`;
                    output += ` * ${i}\n`;
                break;

                default:
                    output += ` * ${i}: ${config[i]}\n`;
                break;
            }
        }

        // Close the output with a PHPDoc DocBlock comment closer
        output += " */";

        // Add an additional newline character to the header output if
        // `addNewlineAfter` is set. Default: false.
        if( this.options.addNewlineAfter === true ) output+= "\n\n";

        return { 
            output: output, 
            config: config 
        };
    }

}