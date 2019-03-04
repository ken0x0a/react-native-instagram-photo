import * as React from 'react';
import { Animated } from 'react-native';

export interface GestureContext {
  gesturePosition: Animated.ValueXY;
  scaleValue: Animated.Value;
  getScrollPosition: () => number;
}
export const { Provider, Consumer } = React.createContext<GestureContext>({} as any);

export const withContext = (Component: React.ComponentType<any>): React.SFC<any> => props => {
  return <Consumer>{value => <Component {...props} {...value} />}</Consumer>;
};
