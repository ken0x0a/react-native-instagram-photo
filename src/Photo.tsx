import * as React from 'react';

import { View, Animated, PanResponder, Easing, findNodeHandle, PanResponderInstance } from 'react-native';
import { ListItem, Avatar } from 'react-native-elements';
import PropTypes from 'prop-types';
const FlexImage = require('react-native-flex-image').default;

import getDistance from './helpers/getDistance';
import getScale from './helpers/getScale';
import measureNode from './helpers/measureNode';

import { GestureContext, withContext } from './context';
import { Measurement } from './Measurement-type';
import { Touch } from './Touch-type';

const RESTORE_ANIMATION_DURATION = 200;

interface Event {
  nativeEvent: {
    touches: Touch[];
  };
}

interface GestureState {
  stateID: string;
  dx: number;
  dy: number;
}

interface Photo {
  name: string;
  avatar: {
    uri: string;
  };
  photo: { uri: string };
}

interface Props extends GestureContext {
  data: Photo;
  isDragging: boolean;
  onGestureStart: (args: { photoURI: string; measurement: Measurement }) => void;
  onGestureRelease: () => void;
}

interface PhotoComponentState {
  // opacity: number;
}
@withContext
export default class PhotoComponent extends React.Component<Props, PhotoComponentState> {
  _parent?: object;
  _photoComponent?: object;
  _gestureHandler!: PanResponderInstance;
  _initialTouches?: object[];
  _selectedPhotoMeasurement?: Measurement;
  _gestureInProgress?: string;

  _opacity: Animated.Value;

  constructor(props: Props) {
    super(props);
    // autobind(this);
    this.state = {
      // opacity: 1
    };

    this._startGesture = this._startGesture.bind(this);
    this._onGestureMove = this._onGestureMove.bind(this);
    this._onGestureRelease = this._onGestureRelease.bind(this);
    this._onGestureRelease = this._onGestureRelease.bind(this);

    this._generatePanHandlers();
    this._initialTouches = [];
    this._opacity = new Animated.Value(1);
  }

  render() {
    const { data } = this.props;
    // const { opacity } = this.state;

    return (
      <View ref={parentNode => (this._parent = parentNode)}>
        <View>
          <ListItem
            // roundAvatar
            leftAvatar={{ source: { uri: data.avatar.uri }, rounded: true }}
            // avatar={{ uri: data.avatar.uri }}
            title={`${data.name}`}
            subtitle="example of subtitle"
            rightIcon={{ name: 'more-vert' }}
          />
        </View>
        <Animated.View
          ref={node => (this._photoComponent = node)}
          {...this._gestureHandler.panHandlers}
          // style={{ opacity }}
          style={{ opacity: this._opacity }}
        >
          <FlexImage source={{ uri: data.photo.uri }} />
        </Animated.View>
      </View>
    );
  }

  _generatePanHandlers() {
    this._gestureHandler = PanResponder.create({
      onStartShouldSetResponderCapture: () => true,
      onStartShouldSetPanResponderCapture: (event: Event) => {
        return event.nativeEvent.touches.length === 2;
      },
      onMoveShouldSetResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: (event: Event) => {
        return event.nativeEvent.touches.length === 2;
      },
      onPanResponderGrant: this._startGesture,
      onPanResponderMove: this._onGestureMove,
      onPanResponderRelease: this._onGestureRelease,
      onPanResponderTerminationRequest: () => {
        return this._gestureInProgress == null;
      },
      onPanResponderTerminate: (event, gestureState) => {
        return this._onGestureRelease(event, gestureState);
      }
    });
  }

  async _startGesture(event: Event, gestureState: GestureState) {
    // Sometimes gesture start happens two or more times rapidly.
    if (this._gestureInProgress) {
      return;
    }

    this._gestureInProgress = gestureState.stateID;
    const { data, onGestureStart, gesturePosition, getScrollPosition } = this.props;
    const { touches } = event.nativeEvent;

    this._initialTouches = touches;

    const selectedPhotoMeasurement = await this._measureSelectedPhoto();
    this._selectedPhotoMeasurement = selectedPhotoMeasurement;
    onGestureStart({
      photoURI: data.photo.uri,
      measurement: selectedPhotoMeasurement
    });

    gesturePosition.setValue({
      x: 0,
      y: 0
    });

    gesturePosition.setOffset({
      x: 0,
      y: selectedPhotoMeasurement.y - getScrollPosition()
    });

    this._opacity.setValue(0);

    // this.setState({opacity:0})
    // Animated.timing(this._opacity, {
    //   toValue: 0,
    //   duration: 200
    // }).start();
  }

  _onGestureMove(event: Event, gestureState: GestureState) {
    let { touches } = event.nativeEvent;
    if (!this._gestureInProgress) {
      return;
    }
    if (touches.length < 2) {
      // Trigger a realease
      this._onGestureRelease(event, gestureState);
      return;
    }

    // for moving photo around
    let { gesturePosition, scaleValue } = this.props;
    let { dx, dy } = gestureState;
    gesturePosition.x.setValue(dx);
    gesturePosition.y.setValue(dy);

    // for scaling photo
    let currentDistance = getDistance(touches);
    let initialDistance = getDistance(this._initialTouches);
    let newScale = getScale(currentDistance, initialDistance);
    scaleValue.setValue(newScale);
  }

  _onGestureRelease(event: any, gestureState: GestureState) {
    if (this._gestureInProgress !== gestureState.stateID) {
      return;
    }

    this._gestureInProgress = null;
    this._initialTouches = [];
    let { onGestureRelease } = this.props;
    let { gesturePosition, scaleValue, getScrollPosition } = this.props;

    // set to initial position and scale
    Animated.parallel([
      Animated.timing(gesturePosition.x, {
        toValue: 0,
        duration: RESTORE_ANIMATION_DURATION,
        easing: Easing.ease
        // useNativeDriver: true,
      }),
      Animated.timing(gesturePosition.y, {
        toValue: 0,
        duration: RESTORE_ANIMATION_DURATION,
        easing: Easing.ease
        // useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: RESTORE_ANIMATION_DURATION,
        easing: Easing.ease
        // useNativeDriver: true,
      })
    ]).start(() => {
      gesturePosition.setOffset({
        x: 0,
        y: (this._selectedPhotoMeasurement && this._selectedPhotoMeasurement.y) || 0 - getScrollPosition()
      });

      this._opacity.setValue(1);

      requestAnimationFrame(() => {
        onGestureRelease();
      });
    });
  }

  async _measureSelectedPhoto() {
    let parent = findNodeHandle(this._parent);
    let photoComponent = findNodeHandle(this._photoComponent);

    let [parentMeasurement, photoMeasurement] = await Promise.all([measureNode(parent), measureNode(photoComponent)]);

    return {
      x: photoMeasurement.x,
      y: parentMeasurement.y + photoMeasurement.y,
      w: photoMeasurement.w,
      h: photoMeasurement.h
    };
  }
}
