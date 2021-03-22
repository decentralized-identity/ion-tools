
const fs = require('fs-extra');
const gulp = require('gulp');
const concat = require('gulp-concat');
const terser = require('gulp-terser');
const mergeStreams = require('merge-stream');


const ionizeDist = 'dist';
const ionizeFiles = [
  'dist/ionize.js'
];
async function ionizeCompile (){
  return new Promise(async resolve => {
    await fs.ensureDir(ionizeDist);
    mergeStreams([
      gulp.src(ionizeFiles)
        .pipe(terser())
        .pipe(concat('ionize.min.js'))
        .pipe(gulp.dest(ionizeDist))

    ]).on('finish', () => resolve())
  });
}

gulp.task('ionize', ionizeCompile);
