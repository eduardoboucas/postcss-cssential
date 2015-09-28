var fs = require('fs');
var postcss = require('postcss');
var uglifycss = require('uglifycss');
var gzipSize = require('gzip-size');
var glob = require('glob');

function error(err) {
    return console.log('[CSSential] (!) ERROR: ' + err);
}

module.exports = postcss.plugin('cssential', function (opts) {
    opts = opts || {};

    return function (css, result) {
        var htmlComment = 'cssential' || opts.htmlComment;
        var cssComment = '!cssential' || opts.cssComment;
        var removeOriginal = opts.removeOriginal !== false;

        var criticalCss = '';

        css.walkComments(function (node) {
            if (node.text !== cssComment) {
                return;
            }

            var parent = node.parent;

            node.remove();
            criticalCss += parent.toString();

            if (removeOriginal) {
                parent.remove();
            }
        });

        // Minifying inline CSS
        criticalCss = uglifycss.processString(criticalCss);

        var regexPattern = '<!--' + htmlComment + '-->';
        regexPattern += '([^<])*';
        regexPattern += '<!--\/' + htmlComment + '-->';

        var regex = new RegExp(regexPattern, 'g');
        var inlineStyle = '<!--' + htmlComment + '-->';
        inlineStyle += '<style>' + criticalCss + '</style>';
        inlineStyle += '<!--/' + htmlComment + '-->';

        var inlineStyleSize = gzipSize.sync(inlineStyle);

        glob(opts.output, {}, function (globError, files) {
            if (globError) {
                return error(globError);
            }

            files.forEach(function (file, index, arr) {
                fs.readFile(file, 'utf8', function (fileError, data) {
                    if (fileError) {
                        return error(fileError);
                    }

                    var newFile = data.replace(regex, inlineStyle);

                    fs.writeFile(file, newFile, function (err) {
                        if (err) {
                            return console.log(err);
                        }

                        console.log('[CSSential] Inline CSS injected to \'' + file + '\' (' + inlineStyleSize + 'b gzipped)');
                    });
                });
            });
        });

        return {
            inline: inlineStyle,
            external: css
        };
    };
});
