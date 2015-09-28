# CSSential

> [PostCSS](https://github.com/postcss/postcss) plugin to identify annotated blocks of critical CSS and inline them into a page.

## Introduction

Inlining *critical path CSS* in an HTML file is a performance optimization used in websites. [Jonas Ohlsson](https://jonassebastianohlsson.com/criticalpathcssgenerator/) defines it as:

> The critical path is the path to render a web page - what's needed before that can happen. CSS Stylesheets block rendering. Until the browser has requested, received, downloaded and parsed your stylesheets, the page will remain blank. By reducing the amount of CSS the browser has to go through, and by inlining it on the page (removing the HTTP request), we can get the page to render much, much faster.

Manually extracting those bits of critical CSS and appending them to a `<style>` tag is not really maintainable (or sane), so numerous automated tools such as [Critical](https://github.com/addyosmani/critical) or [Penthouse](https://github.com/pocketjoso/penthouse) do it automatically — they decide what styles are critical on a global level, attempting to include styles for everything "above the fold". 

**CSSential** is a simpler and humbler approach to the problem, putting the developer in control of which portions of a style sheet should be considered critical (e.g. you might just want to get the classes that form the structure of a page, or the base colors).

## Usage

To mark a CSS block as essential, include a comment inside it:

*`main.css` (before):*
```css
.important-stuff {
    /*!cssential*/
    width: 50%;
    color: tomato;
}

.not-so-important {
    font-weight: 300;
}
```

The blocks marked as essential are (optionally) removed from the output CSS file and added as inline styles in one or more output files. Those files must have a placeholder inside the `<head>` tag in the form of an HTML comment:

*`index.html` (before):*
```html
<!DOCTYPE html>
<html>
    <head>
        <title>Title of the document</title>
        
        <!--cssential--><!--/cssential-->
    </head>

    <body>
        <p>Hello world</p>
        
        <link rel="stylesheet" type="text/css" href="/external-stylesheet.css">
    </body>

</html>
```

Which will result in the following output files:

*`main.css` (after):*
```css
.not-so-important {
    font-weight: 300;
}
```

*`index.html` (after):*
```html
<!DOCTYPE html>
<html>
    <head>
        <title>Title of the document</title>
        
        <!--cssential--><style>.important-stuff{width:50%;color:tomato;}</style><!--/cssential-->
    </head>

    <body>
        <p>Hello world</p>
        
        <link rel="stylesheet" type="text/css" href="/external-stylesheet.css">
    </body>

</html>
```

### Options

The plugin receives as argument an options object, supporting the following properties:

| Option           | Default value   | Description                                                               |
|------------------|-----------------|---------------------------------------------------------------------------|
| `output`         | —               | Glob of files to inject inline styles in (e.g. `dest/*.+(html|dust)`      |
| `cssComment`     | `!cssential`    | Content of the CSS comment that marks a block as essential                |
| `htmlComment`    | `cssential`     | Content of the HTML comment that serves as placeholder for inline styles  |
| `removeOriginal` | `true`          | Whether to remove essential styles from the output style sheet            |

### Example (Gulp)

```js
gulp.task('cssential', function () {
	var processors = [
		cssential({
			output: 'views/*.+(html|dust)',
			cssComment: '!cssential',
			htmlComment: 'cssential',
			removeOriginal: true
		})
	];

	return gulp.src('main.css')
		.pipe(plugins.postcss(processors))
		.pipe(gulp.dest('dist/'));
});
```

Takes `main.css`, looks for blocks marked with `/*!cssential*/` and injects the critical CSS in every HTML or Dust file within the `views/` directory that contain the `<!--cssential-->` placeholder.
