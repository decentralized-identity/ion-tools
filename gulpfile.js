
const fs = require('fs-extra');
const gulp = require('gulp');
const concat = require('gulp-concat');
const terser = require('gulp-terser');
const mergeStreams = require('merge-stream');


const ionJsDist = 'dist';
const ionJsFiles = [
  'dist/ion.js'
];
async function ionJsCompile (){
  return new Promise(async resolve => {
    await fs.ensureDir(ionJsDist);
    mergeStreams([
      gulp.src(ionJsFiles, { allowEmpty: true })
        .pipe(terser())
        .pipe(concat('ion.min.js'))
        .pipe(gulp.dest(ionJsDist))

    ]).on('finish', () => resolve())
  });
}

gulp.task('ion.js', ionJsCompile);
