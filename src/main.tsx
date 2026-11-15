import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import React from 'react';
import ReactDOM from 'react-dom/client';
import AuthGate from './AuthGate';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><AuthGate /></React.StrictMode>,
);

if (Capacitor.getPlatform() === 'android') {
  void SystemBars.setStyle({ style: SystemBarsStyle.Light }).catch(error => {
    console.warn('Estilo da barra de status indisponível.', error);
  });
}
