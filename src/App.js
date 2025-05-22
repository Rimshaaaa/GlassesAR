import React, { useState } from 'react';
import GlassesTryOn from './GlassesTryOn';

export const App = () => {
  const [started, setStarted] = useState(false);

  return (
    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
      {!started ? (
        <>
          <h1>Virtual Glasses Try-On</h1>
          <button
            onClick={() => setStarted(true)}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.2rem',
              cursor: 'pointer',
              borderRadius: '8px',
              backgroundColor: '#28a745',
              color: '#fff',
              border: 'none',
            }}
          >
            Start Try-On
          </button>
        </>
      ) : (
        <GlassesTryOn/>
      )}
    </div>
  );
};

export default App;
