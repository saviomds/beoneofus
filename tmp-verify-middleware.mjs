import('./middleware.js').then(() => {
  console.log('middleware:import-ok');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
