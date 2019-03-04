import * as React from 'react';
import { View, Animated, StyleSheet } from 'react-native';

import { GestureContext, withContext } from './context';
import { Measurement } from './Measurement-type';

interface Props extends Pick<GestureContext, 'gesturePosition' | 'scaleValue'> {
  selectedPhoto: {
    photoURI: string;
    measurement: Measurement;
  };
}

interface State {
  isLoaded: boolean;
}

@withContext
export default class SelectedPhoto extends React.Component<Props, State> {
  state = { isLoaded: false };

  render() {
    const { selectedPhoto } = this.props;
    const { isLoaded } = this.state;

    const { gesturePosition, scaleValue } = this.props;

    const animatedStyle = {
      transform: gesturePosition.getTranslateTransform()
    };
    animatedStyle.transform.push({
      scale: scaleValue
    });

    const imageStyle = [
      {
        position: 'absolute',
        zIndex: 10,
        width: selectedPhoto.measurement.w,
        height: selectedPhoto.measurement.h,
        opacity: isLoaded ? 1 : 0
      },
      animatedStyle
    ];

    const backgroundOpacityValue = scaleValue.interpolate({
      inputRange: [1.2, 3],
      outputRange: [0, 0.6]
    });

    return (
      <View style={styles.root}>
        <Animated.View
          style={[
            styles.background,
            {
              opacity: backgroundOpacityValue
            }
          ]}
        />
        <Animated.Image
          style={imageStyle}
          onLoad={() => this.setState({ isLoaded: true })}
          source={{
            uri: selectedPhoto.photoURI
          }}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'black'
  }
});
