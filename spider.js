async function run() {
  const t = await fetch('https://docs.apinebula.com/assets/js/runtime~main.242e9b16.js').then(r => r.text());
  console.log(t);
}
run();
