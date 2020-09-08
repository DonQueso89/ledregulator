import { StatusBar } from "expo-status-bar";
import React, { useState, useMemo, useEffect } from "react";
import { StyleSheet, View, Modal, FlatList } from "react-native";
import {
  DefaultTheme,
  Provider as PaperProvider,
  Button,
  DataTable,
  TextInput,
  IconButton,
  Avatar,
  Headline
} from "react-native-paper";
import * as R from "ramda";
import LedColorPicker from "./components/LedColorPicker"
import { loadConfig, saveConfig } from "./api"
import FlashMessage from "react-native-flash-message";


const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "black",
    accent: "yellow",
  },
};

const SEQUENCE = [
  [0.9, 3],
  [0.7, 6],
  [0.2, 8],
  [0.1, 5],
  [0.4, 10],
  [0.9, 2],
];

export default function App() {
  const [selectedRows, setSelectedRows] = useState([]);
  const [sequence, setSequence] = useState(SEQUENCE);
  const [newTarget, setNewTarget] = useState("0");
  const [newTime, setNewTime] = useState("0");
  const [initialBrightness, setInitialBrightness] = useState("0.0");
  const [colorPickerVisible, setColorPickerVisible] = useState(false)
  const [color, setColor] = useState("#ff0000");
  const dismissColorPicker = () => setColorPickerVisible(false)
  const openColorPicker = () => setColorPickerVisible(true)
  const addRow = () => {
    setSequence((x) => [...sequence, [parseFloat(newTarget), parseInt(newTime)]]);
  };
  const removeRows = () => {
    setSequence((seq) =>
      seq
        .map((e, i) => (R.includes(i, selectedRows) ? null : e))
        .filter((x) => x)
    );
  };
  const repeatRows = () => {
    const [min, max] = [R.reduce(R.min, Infinity, selectedRows), R.reduce(R.max, -Infinity, selectedRows)]
    setSequence([...sequence.slice(0, max + 1), ...sequence.slice(min, max + 1), ...sequence.slice(max + 1, sequence.length)])
  };
  const selectRow = (id) => {
    // For simplicity, only allow contiguous sequences to be selected
    const canSelect =
      selectedRows.length === 0 ||
      id - R.reduce(R.max, -Infinity, selectedRows) === 1 ||
      R.reduce(R.min, Infinity, selectedRows) - id === 1;
    if (canSelect) {
      setSelectedRows((x) => R.uniq([...x, id]));
    }
  };

  const deselectRow = (id) => {
    // For simplicity, only allow contiguous sequences to be selected
    const canDeselect =
      id === R.reduce(R.max, -Infinity, selectedRows) ||
      id === R.reduce(R.min, Infinity, selectedRows);
    if (canDeselect) {
      setSelectedRows((x) => R.without([id], x));
    }
  };
  const buttonsDisabled = selectedRows.length === 0;

  useEffect(() => {
    setSelectedRows([]);
  }, [sequence]);

  const reloadConfig = () => {
    loadConfig().then(newConfig => {
      if (newConfig) {
        setColor(newConfig.color)
        setInitialBrightness(newConfig.initialBrightness.toString())
        setSequence(newConfig.sequence)
      }
    })
  }

  useEffect(() => {
    reloadConfig()
  }, [])

  const handleSave = () => {
    saveConfig({ initialBrightness: parseFloat(initialBrightness), color, sequence })
  }

  const rows = useMemo(() => {
    return sequence.map(([target, time], idx) => {
      const isSelected = R.includes(idx, selectedRows);
      return (
        <DataTable.Row
          style={isSelected ? styles.selectedRow : styles.unselectedRow}
          onPress={() => (isSelected ? deselectRow(idx) : selectRow(idx))}
          key={idx}
        >
          <DataTable.Cell numeric>{target}</DataTable.Cell>
          <DataTable.Cell numeric>{time}</DataTable.Cell>
        </DataTable.Row>
      );
    });
  }, [sequence, selectedRows]);

  return (
    <PaperProvider theme={theme}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Avatar.Image size={72} source={require('./assets/splash.jpeg')} />
            <Headline>Ledcontrollosaurus Rex</Headline>
          </View>
          <View style={styles.buttonPanel}>
            <TextInput
              label={"initial brightness"}
              value={initialBrightness}
              onChangeText={setInitialBrightness}
              style={styles.inputCell}
              mode="outlined"
            />
            <Button
              icon={"brush"}
              mode={"outlined"}
              onPress={openColorPicker}
            >
              Set color
            </Button>
            <Button
              icon={"floppy"}
              mode={"outlined"}
              onPress={handleSave}
            >
              Save
            </Button>
          </View>
          <View style={styles.buttonPanel}>
            <Button
              icon={"autorenew"}
              mode={"outlined"}
              disabled={buttonsDisabled}
              onPress={repeatRows}
            >
              Repeat rows
            </Button>
            <Button
              icon={"eraser"}
              mode={"outlined"}
              disabled={buttonsDisabled}
              onPress={removeRows}
            >
              Delete rows
            </Button>
            <Button
              icon={"autorenew"}
              mode={"outlined"}
              onPress={reloadConfig}
            >
              Sync
            </Button>
          </View>
          <DataTable style={styles.tableStyle}>
            <DataTable.Header theme={theme}>
              <DataTable.Title theme={theme} numeric>
                Target
              </DataTable.Title>
              <DataTable.Title theme={theme} numeric>
                time
              </DataTable.Title>
            </DataTable.Header>
            {rows}
            <View style={styles.inputRow}>
              <TextInput
                label="target"
                value={newTarget}
                onChangeText={setNewTarget}
                style={styles.inputCell}
                mode="outlined"
              />
              <TextInput
                label="time"
                value={newTime}
                onChangeText={setNewTime}
                style={styles.inputCell}
                mode="outlined"
              />
              <IconButton icon="plus-outline" size={20} onPress={addRow} />
            </View>
          </DataTable>
          <StatusBar style="auto" />
          <Modal visible={colorPickerVisible} animationType={"slide"} transparent={true}>
            <LedColorPicker
              initialColor={color}
              updateColor={setColor}
              dismiss={dismissColorPicker}
            />
          </Modal>
        </View>
          <FlashMessage position={"top"} />
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  tableStyle: {
    flex: 1,
  },
  buttonPanel: {
    flexDirection: "row",
    margin: 10
  },
  inputRow: {
    flexDirection: "row",
    width: "100%",
  },
  inputCell: {
    flex: 1,
  },
  selectedRow: {
    backgroundColor: "pink",
  },
  unselectedRow: {
    backgroundColor: null,
  },
  header: {
    flex: 0.1,
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 20
  }
});
