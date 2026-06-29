import https from 'https';

https.get('https://googleusercontent.com/image_collection/image_retrieval/6880348335031669539', (res) => {
  console.log('Status code:', res.statusCode);
  if (res.statusCode >= 300 && res.statusCode < 400) {
    console.log('Redirect location:', res.headers.location);
  }
}).on('error', (e) => {
  console.error('Error:', e);
});
