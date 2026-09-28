import { DeviceEventEmitter } from 'react-native';

export type CarteraChange = {
  tipo?: 'pago' | 'credito';
  monto?: number;
  cliente?: string;
  estadoCredito?: 'vigente' | 'vencido' | 'pagado';
};

type CarteraListener = (change?: CarteraChange) => void;

const CARTERA_CHANGED = 'fiadocheck:carteraChanged';

export function subscribeCarteraChanged(cb: CarteraListener) {
  const sub = DeviceEventEmitter.addListener(CARTERA_CHANGED, cb);
  return () => {
    sub.remove();
  };
}

export function publishCarteraChanged(change?: CarteraChange) {
  DeviceEventEmitter.emit(CARTERA_CHANGED, change);
}
