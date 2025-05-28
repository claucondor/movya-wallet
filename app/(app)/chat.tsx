import * as React from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ScrollView,
	Image,
	Platform,
	StatusBar as ReactNativeStatusBar,
	Animated,
	Dimensions,
	KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { StatusBar } from 'expo-status-bar';
import ArrowIcon from '../../assets/arrow.svg';

const Chat = () => {

	return (
		<SafeAreaView style={styles.chat}>
			<StatusBar style="light" />
			<Video
				source={require('../../assets/bg/header-bg.webm')}
				style={styles.backgroundVideo}
				isLooping
				shouldPlay
				isMuted
				resizeMode={ResizeMode.COVER}
			/>
			<View style={styles.content}>
				<View style={[styles.appBar, styles.appBarFlexBox]}>
					<View style={styles.avatarWrapper}>
						<View style={[styles.avatar, styles.avatarLayout]}>
							{/* Replace Image with MaterialIcons for placeholder */}
							<MaterialIcons name="account-circle" size={32} color="#FFF" style={styles.iconLayout} />
						</View>
					</View>
					<View style={[styles.textContent, styles.contentFlexBox]}>
						<Text style={styles.headline} numberOfLines={1}>$0.01</Text>
						<Text style={styles.supportingText} numberOfLines={1}>Total Balance</Text>
					</View>
					<View style={[styles.leadingIconParent, styles.parentFlexBox]}>
						<View style={[styles.leadingIcon, styles.content3Layout]}>
							<View style={[styles.content1, styles.contentFlexBox]}>
								{/* Change icon color to white */}
								<MaterialIcons name="person" size={24} style={[styles.stateLayerIcon, styles.iconLayout, { color: '#FFF' }]} />
							</View>
						</View>
						<View style={[styles.leadingIcon, styles.content3Layout]}>
							<View style={[styles.content1, styles.contentFlexBox]}>
								{/* Change icon color to white */}
								<MaterialIcons name="message" size={24} style={[styles.stateLayerIcon, styles.iconLayout, { color: '#FFF' }]} />
							</View>
						</View>
					</View>
				</View>
				<View style={[styles.textCenteredParent, styles.parentFlexBox]}>
					<View style={[styles.textCentered, styles.textCenteredFlexBox]}>
						<View style={styles.header}>
							<Text style={[styles.hello, styles.helloTypo]}>Hello, </Text>
							<MaskedView
								style={{ height: styles.helloTypo.lineHeight }}
								maskElement={
									<Text style={styles.helloTypo}>$UserName</Text>
								}>
								<LinearGradient
									colors={['#0461F0', '#9CCAFF']}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 0 }}
									style={{ flex: 1 }}
								>
									<Text style={[styles.helloTypo, { opacity: 0 }]}>$UserName</Text>
								</LinearGradient>
							</MaskedView>
						</View>
						<View style={[styles.swipe, styles.swipeFlexBox]}>
							<Text style={[styles.swipe1, styles.timeTypo]}>Swipe to change view</Text>
							<ArrowIcon width={24} height={24} style={styles.swipeChild} />
						</View>
					</View>
					<View style={[styles.bottomContainer, styles.textCenteredFlexBox]}>
						<View style={styles.suggestionsCarouselContainer}>
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								style={styles.chatSuggestionsScrollView}
								contentContainerStyle={styles.chatSuggestionsContainer}
							>
								<View style={styles.chatSuggestionsRow}>
									<View style={styles.suggestionCard}>
										<Text style={[styles.labelText, styles.labelTypo]}>Send Money to a Friend</Text>
									</View>
									<View style={styles.suggestionCard}>
										<Text style={[styles.labelText, styles.labelTypo]}>Send Money to a Wallet</Text>
									</View>
									<View style={styles.suggestionCard}>
										<Text style={[styles.labelText, styles.labelTypo]}>How to send AVA?</Text>
									</View>
									<View style={styles.suggestionCard}>
										<Text style={[styles.labelText, styles.labelTypo]}>Who are you?</Text>
									</View>
								</View>
							</ScrollView>
							<LinearGradient
                                colors={['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.fadeGradient, styles.leftFadeGradient]}
                                pointerEvents="none"
                            />
                            <LinearGradient
                                colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 1)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.fadeGradient, styles.rightFadeGradient]}
                                pointerEvents="none"
                            />
						</View>

						<View style={[styles.chatContainer, styles.swipeFlexBox]}>
							<View style={styles.dollarIconContainer}>
								<MaterialIcons name="attach-money" size={30} color="#FFFFFF" />
							</View>
							<View style={styles.chatInputPosition}>
								<View style={styles.textField}>
									<View style={styles.stateLayer}>
										<TextInput
											placeholder="Ask Movya"
											placeholderTextColor={styles.labelTypo.color}
											style={[styles.labelText4, styles.inputField]}
										/>
										<TouchableOpacity onPress={() => console.log('Send pressed!')} style={styles.sendButton}>
											<MaterialIcons name="send" size={24} color="#49454f" />
										</TouchableOpacity>
									</View>
								</View>
							</View>
						</View>
					</View>
				</View>
			</View>
		</SafeAreaView>);
};

const styles = StyleSheet.create({
	backgroundVideo: {
		...StyleSheet.absoluteFillObject,
		zIndex: -1,
	},
	appBarFlexBox: {
		gap: 16,
		flexDirection: "row",
		alignSelf: "stretch"
	},
	avatarLayout: {
		borderRadius: 100,
		overflow: "hidden"
	},
	iconLayout: {
		maxWidth: "100%",
		overflow: "hidden",
		width: "100%"
	},
	contentFlexBox: {
		justifyContent: "center",
		alignItems: "center"
	},
	parentFlexBox: {
		gap: 0,
		justifyContent: "space-between"
	},
	content3Layout: {
		height: 48,
		justifyContent: "center"
	},
	textCenteredFlexBox: {
		gap: 12,
		justifyContent: "center",
		alignItems: "center"
	},
	helloTypo: {
		textAlign: "left",
		lineHeight: 40,
		fontSize: 24,
		fontFamily: "Geist",
		fontWeight: "700"
	},
	swipeFlexBox: {
		gap: 10,
		flexDirection: "row",
		alignItems: "center"
	},
	timeTypo: {
		lineHeight: 20,
		fontSize: 14,
		textAlign: "left",
		fontFamily: "Geist",
		fontWeight: "500"
	},
	labelTypo: {
		color: "#49454f",
		fontFamily: "Geist",
		textAlign: "left"
	},
	suggestionCard: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: "#79747e",
		borderStyle: "solid",
		borderRadius: 16,
		justifyContent: "center",
		alignItems: "center",
	},
	chatInputPosition: {
		borderTopRightRadius: 4,
		borderTopLeftRadius: 4,
		flex: 1
	},
	headerFlexBox: {
		alignItems: "center",
		flexDirection: "row"
	},
	devicedeviceFramePosition: {
		right: 0,
		left: 0,
		position: "absolute"
	},
	imageIcon: {
		height: "100%",
		top: "0%",
		right: "0%",
		bottom: "0%",
		left: "0%",
		borderRadius: 400,
		maxHeight: "100%",
		position: "absolute"
	},
	avatar: {
		width: 32,
		height: 32
	},
	avatarWrapper: {
		justifyContent: "space-between",
		width: 83,
		alignItems: "center",
		flexDirection: "row"
	},
	headline: {
		fontSize: 22,
		lineHeight: 28,
		fontWeight: "700",
		fontFamily: "Geist",
		textAlign: "center",
		color: "#fff",
		alignSelf: "stretch",
		overflow: "hidden"
	},
	supportingText: {
		color: "#e7e0ec",
		fontFamily: "Geist",
		fontWeight: "500",
		lineHeight: 16,
		letterSpacing: 1,
		fontSize: 12,
		textAlign: "center",
		alignSelf: "stretch",
		overflow: "hidden"
	},
	textContent: {
		flex: 1
	},
	stateLayerIcon: {
		height: 40,
		alignSelf: "stretch"
	},
	content1: {
		width: 40,
		borderRadius: 100,
		overflow: "hidden"
	},
	leadingIcon: {
		width: 48,
		alignItems: "center",
		flexDirection: "row"
	},
	leadingIconParent: {
		width: 83,
		gap: 0,
		alignItems: "center",
		flexDirection: "row"
	},
	appBar: {
		paddingVertical: 32,
		paddingHorizontal: 16,
		alignItems: "center"
	},
	hello: {
		color: "#0461f0"
	},
	header: {
		width: 264,
		alignItems: "baseline",
		flexDirection: "row"
	},
	swipe1: {
		color: "#625b71",
		letterSpacing: 0
	},
	swipeChild: {
	},
	swipe: {
		justifyContent: "center",
		alignItems: "center"
	},
	textCentered: {
		padding: 10,
		flex: 1
	},
	labelText: {
		letterSpacing: 0,
		fontSize: 11,
		lineHeight: 14,
		textAlign: 'center',
	},
	suggestion2: {
		alignSelf: "stretch"
	},
	viewsButtonIcon: {
		borderRadius: 16
	},
	dollarIconContainer: {
		backgroundColor: '#0461f0',
		borderRadius: 12,
		width: 50,
		height: 50,
		justifyContent: 'center',
		alignItems: 'center',
	},
	labelText4: {
		fontSize: 16,
		lineHeight: 24,
		color: "#49454f",
		fontFamily: "Geist",
		letterSpacing: 1,
	},
	stateLayer: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		gap: 8,
	},
	textField: {
		height: 56,
		borderWidth: 1,
		borderColor: "#79747e",
		borderStyle: "solid",
		borderRadius: 100,
		alignSelf: "stretch",
		overflow: 'hidden',
	},
	inputField: {
		flex: 1,
		height: '100%',
	},
	sendButton: {
		padding: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	chatContainer: {
		alignSelf: "stretch",
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	bottomContainer: {
		alignSelf: "stretch",
		backgroundColor: "#fff",
		gap: 12,
	},
	textCenteredParent: {
		borderTopLeftRadius: 32,
		borderTopRightRadius: 32,
		backgroundColor: "#fff",
		paddingVertical: 24,
		paddingHorizontal: 16,
		alignSelf: "stretch",
		flex: 1,
		gap: 12,
	},
	content: {
		flex: 1,
		width: "100%",
	},
	time: {
		letterSpacing: 0.1,
		color: "#fff",
		fontSize: 14
	},
	rightIcons: {},
	devicedeviceFrameComponents: {
		top: 0,
		height: 52,
		alignItems: "flex-end",
		paddingHorizontal: 24,
		paddingVertical: 10,
		gap: 0,
		justifyContent: "space-between",
		flexDirection: "row"
	},
	handle: {
		marginTop: -2,
		marginLeft: -54,
		top: "50%",
		left: "50%",
		borderRadius: 12,
		backgroundColor: "#202124",
		width: 108,
		height: 4,
		position: "absolute"
	},
	devicedeviceFrameComponents1: {
		bottom: 0,
		height: 24
	},
	chat: {
		backgroundColor: 'transparent',
		height: 892,
		overflow: "hidden",
		width: "100%",
		flex: 1
	},
	suggestionsCarouselContainer: {
		position: 'relative',
		alignSelf: 'stretch',
	},
	chatSuggestionsScrollView: {
		maxHeight: 40,
	},
	chatSuggestionsContainer: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
	},
	chatSuggestionsRow: {
		flexDirection: "row",
		gap: 4,
		alignItems: "center",
	},
	fadeGradient: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		width: 30,
		height: '100%',
	},
	leftFadeGradient: {
		left: 0,
	},
	rightFadeGradient: {
		right: 0,
	},
});

export default Chat;
