import React, { useState, useContext, useMemo, useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";
import { ColorPicker, fromHsv, toHsv } from "react-native-color-picker";
import useDebounce from "../hooks/useDebounce"


const LedColorPicker = ({ initialColor, updateColor, dismiss }) => {
  const [color, setColor] = useState(toHsv(initialColor))

  const debouncedColor = useDebounce(color, 500)
  useEffect(() => {
      updateColor(fromHsv(debouncedColor))
  }, [debouncedColor])

  const handleSelect = () => {
    updateColor(color)
    dismiss()
  }

  return (
    <View style={styles.colorPickerContainer}>
      <ColorPicker
        onColorChange={setColor}
        style={styles.colorPicker}
        color={color}
        onColorSelected={handleSelect}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  colorPickerContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    width: "100%"
  },
  colorPicker: {
    flex: 1,
  },
});

export default LedColorPicker;