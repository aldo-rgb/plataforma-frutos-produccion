// Test del endpoint de slots disponibles
const testEndpoint = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/mentor/slots-disponibles?mentorId=14');
    const data = await response.json();
    console.log('\n📊 Respuesta del endpoint:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testEndpoint();
