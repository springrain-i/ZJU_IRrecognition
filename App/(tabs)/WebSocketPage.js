import React, { useState, useRef } from "react";
import { StyleSheet, View, Image, Text, Dimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native"; // 引入useFocusEffect
import { Buffer } from "buffer";

export default function WebSocketPage({ route }) {
  const { webSocketUrl } = route.params; // 获取传递过来的 WebSocket URL
  const [frame, setFrame] = useState(null);
  const [status, setStatus] = useState("Disconnected");
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null); // 用于存储重连定时器的引用

  const connectWebSocket = () => {
    setStatus("Connecting...");
    socketRef.current = new WebSocket(webSocketUrl);

    socketRef.current.onopen = () => {
      setStatus("Connected");
    };

    socketRef.current.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        const data = new Uint8Array(event.data);
        const base64Image = Buffer.from(data).toString("base64");
        const imgUri = `data:image/jpeg;base64,${base64Image}`;

        Image.getSize(imgUri, (width, height) => {
          setImageSize({ width, height });
        });

        setFrame(imgUri);
      }
    };

    socketRef.current.onclose = () => {
      setStatus("Disconnected");
      reconnectWebSocket();
    };

    socketRef.current.onerror = (error) => {
      setStatus("Error occurred, retrying...");
      reconnectWebSocket();
    };
  };

  const reconnectWebSocket = () => {
    if (reconnectTimerRef.current) return; // 防止重复设置重连定时器
    reconnectTimerRef.current = setTimeout(() => {
      connectWebSocket();
      reconnectTimerRef.current = null; // 清除定时器引用
    }, 3000);
  };

  const stopReconnect = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null; // 清除定时器引用
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      // 页面聚焦时连接 WebSocket
      connectWebSocket();

      // 页面失去焦点时停止重连并关闭连接
      return () => {
        if (socketRef.current) {
          socketRef.current.close();
          socketRef.current = null;
          stopReconnect(); // 停止重连尝试
        }
      };
    }, [webSocketUrl]) // 确保当 webSocketUrl 改变时重新连接
  );

  const calculateImageSize = () => {
    const screenWidth = Dimensions.get("window").width;
    const screenHeight = Dimensions.get("window").height;
    const { width: imageWidth, height: imageHeight } = imageSize;

    if (imageWidth === 0 || imageHeight === 0) {
      return { width: 0, height: 0 };
    }

    const screenAspect = screenWidth / screenHeight;
    const imageAspect = imageWidth / imageHeight;

    if (imageAspect > screenAspect) {
      const scaledHeight = screenWidth / imageAspect;
      return { width: screenWidth, height: scaledHeight };
    } else {
      const scaledWidth = screenHeight * imageAspect;
      return { width: scaledWidth, height: screenHeight };
    }
  };

  const displaySize = calculateImageSize();

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{status}</Text>
      {frame ? (
        <Image
          source={{ uri: frame }}
          style={{
            width: displaySize.width,
            height: displaySize.height,
            resizeMode: "contain",
          }}
        />
      ) : (
        <Text style={styles.waiting}>Waiting for video frames...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  status: {
    color: "#fff",
    marginBottom: 10,
  },
  waiting: {
    color: "#fff",
    fontSize: 18,
  },
});
