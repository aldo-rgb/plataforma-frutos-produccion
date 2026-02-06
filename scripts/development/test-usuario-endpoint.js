async function testUsuarioEndpoint() {
  try {
    console.log('🧪 Probando endpoint /api/coordinador/usuarios/68...\n');
    
    // Primero hacer login como coordinador
    const loginRes = await fetch('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'cordi@wer.com',
        password: 'Frutos25!'
      })
    });

    console.log('Login status:', loginRes.status);

    // Ahora probar el endpoint
    const res = await fetch('http://localhost:3000/api/coordinador/usuarios/68', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    console.log('Status:', res.status);
    const data = await res.json();
    console.log('\nRespuesta:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testUsuarioEndpoint();
