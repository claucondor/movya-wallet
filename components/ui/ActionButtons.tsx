import React from "react";
import { StyleSheet, View } from "react-native";
import ActionButton from "./ActionButton";

interface ActionButtonsProps {
  onSend?: () => void;
  onReceive?: () => void;
  onDeposit?: () => void;
  onSwap?: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onSend,
  onReceive,
  onDeposit,
  onSwap,
}) => {

  return (
    <View style={styles.container}>
      <ActionButton
        iconName="send"
        label="Send"
        onClick={onSend}
      />
      <ActionButton
        iconName="arrow-downward"
        label="Receive"
        onClick={onReceive}
      />
      <ActionButton
        iconName="credit-card"
        label="Deposit"
        onClick={onDeposit}
      />
      <ActionButton
        iconName="swap-horiz"
        label="Swap"
        onClick={onSwap}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 16,
  }
});

export default ActionButtons;