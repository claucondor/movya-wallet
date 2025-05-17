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
import ArrowIcon from '../../assets/vectors/arrow.svg';

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
						{/* Modified View style here: removed styles.parentFlexBox */}
						<View style={styles.header}>
							<Text style={[styles.hello, styles.helloTypo]}>Hello, </Text> {/* Added space and kept existing styles */}
							{/* Gradient text for $UserName */}
							<MaskedView
								style={{ height: styles.helloTypo.lineHeight }} // Ensure height matches text line height
								maskElement={
									<Text style={styles.helloTypo}>$UserName</Text>
								}>
								<LinearGradient
									colors={['#0461F0', '#9CCAFF']}
									start={{ x: 0, y: 0 }} // Gradient start (left)
									end={{ x: 1, y: 0 }}   // Gradient end (right)
									style={{ flex: 1 }}    // Ensure gradient fills the mask
								>
									{/* This Text is for sizing the gradient area; its content must match maskElement */}
									<Text style={[styles.helloTypo, { opacity: 0 }]}>$UserName</Text>
								</LinearGradient>
							</MaskedView>
						</View>
						<View style={[styles.swipe, styles.swipeFlexBox]}>
							<Text style={[styles.swipe1, styles.timeTypo]}>Swipe to change view</Text>
							{/* Replace MaterialIcons with your SVG */}
							<ArrowIcon width={24} height={24} style={styles.swipeChild} />
						</View>
					</View>
					<View style={[styles.bottomContainer, styles.textCenteredFlexBox]}>
						<View style={styles.appBarFlexBox}>
							<View style={styles.suggestionCard}>
								<Text style={[styles.labelText, styles.labelTypo]}>Send Money to a Friend</Text>
							</View>
							<View style={styles.suggestionCard}>
								<Text style={[styles.labelText, styles.labelTypo]}>Send Money to a Wallet</Text>
							</View>
							<View style={[styles.suggestionCard]}>
								<Text style={[styles.labelText, styles.labelTypo]}>How to send AVA?</Text>
							</View>
							<View style={[styles.suggestionCard]}>
								<Text style={[styles.labelText, styles.labelTypo]}>Who are you?</Text>
							</View>
						</View>
							<View style={[styles.chatContainer, styles.swipeFlexBox]}>
							{/* Updated part for the dollar icon */}
							<View style={styles.dollarIconContainer}>
								<MaterialIcons name="attach-money" size={30} color="#FFFFFF" />
							</View>
							{/* End of updated part */}
							<View style={styles.chatInputPosition}>
								<View style={styles.textField}>
									{/* Modified stateLayer to directly contain TextInput and Button */}
									<View style={styles.stateLayer}>
										{/* Replace Text with TextInput */}
										<TextInput
											placeholder="Ask Movya"
											placeholderTextColor={styles.labelTypo.color} // Use existing color for placeholder
											style={[styles.labelText4, styles.inputField]} // Apply existing text styles and new input field styles
										/>
										{/* Wrap Icon in TouchableOpacity */}
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
		zIndex: -1, // Ensure it's behind all other content
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
		fontSize: 32,
		fontFamily: "Geist",
		fontWeight: "700" // Changed from "500" to "700" for bold
	},
	swipeFlexBox: {
		gap: 10,
		flexDirection: "row",
		alignItems: "center" // Added for vertical alignment
	},
	timeTypo: {
		lineHeight: 20,
		fontSize: 14,
		textAlign: "left",
		fontFamily: "Geist", // Changed from Roboto-Medium
		fontWeight: "500"
	},
	labelTypo: {
		color: "#49454f",
		fontFamily: "Geist", // Changed from Roboto-Regular
		textAlign: "left"
	},
	suggestionCard: {
		padding: 8,
		borderWidth: 1,
		borderColor: "#79747e",
		borderStyle: "solid",
		borderRadius: 16,
		justifyContent: "center",
		alignItems: "center",
		flex: 1
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
		fontFamily: "Geist", // Changed from Roboto-Bold
		textAlign: "center",
		color: "#fff",
		alignSelf: "stretch",
		overflow: "hidden"
	},
	supportingText: {
		color: "#e7e0ec",
		fontFamily: "Geist", // Changed from Roboto-Medium
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
		alignItems: "center",
		flexDirection: "row"
	},
	swipe1: {
		color: "#625b71",
		letterSpacing: 0
	},
	swipeChild: {
		// maxHeight: "100%" // You might not need maxHeight anymore,
		// SVGs usually scale well with width/height props.
		// You can add other styles if needed, e.g., color if your SVG supports it via `fill` prop
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
		lineHeight: 16,
		fontSize: 12,
		color: "#49454f",
		fontFamily: "Roboto-Regular",
		alignSelf: "stretch"
	},
	suggestion2: {
		alignSelf: "stretch"
	},
	viewsButtonIcon: { // This style was previously on the icon, ensure it's not conflicting or remove if unused
		borderRadius: 16
	},
	// Add new style for the dollar icon container
	dollarIconContainer: {
		backgroundColor: '#0461f0', // Using a blue from your existing styles
		borderRadius: 12,
		width: 50,
		height: 50,
		justifyContent: 'center',
		alignItems: 'center',
	},
	labelText4: { // Keep for font styling, flex:1 will be on inputField
		fontSize: 16,
		lineHeight: 24,
		color: "#49454f",
		fontFamily: "Geist", // Changed from Roboto-Regular
		letterSpacing: 1,
		// Removed flex: 1, will be handled by inputField style
	},
	// Remove labelTextContainer as TextInput is now a direct child of stateLayer
	// labelTextContainer: {
	//   alignSelf: "stretch"
	// },
	// Remove content3 and content3Layout as TextInput is now a direct child of stateLayer
	// content3: {
	//   paddingHorizontal: 0,
	//   paddingVertical: 4,
	//   flex: 1
	// },
	stateLayer: { // Modified
		flex: 1, // Ensure it fills the textField
		flexDirection: "row",
		alignItems: "center", // Vertically center TextInput and Button
		paddingHorizontal: 16, // Add some horizontal padding
		gap: 8, // Space between TextInput and Button
		// Removed borderTopRightRadius, borderTopLeftRadius as these are on chatInputPosition or textField
		// Removed alignSelf: "stretch" as flex:1 on parent (textField) and this (stateLayer) handles it
		// Removed paddingTop, paddingBottom, paddingLeft as paddingHorizontal and gap handle spacing
	},
	textField: {
		height: 56,
		borderWidth: 1,
		borderColor: "#79747e",
		borderStyle: "solid",
		borderRadius: 100, // This creates the pill shape
		alignSelf: "stretch",
		overflow: 'hidden', // Ensures children conform to borderRadius
	},
	// Add new style for the TextInput
	inputField: {
		flex: 1, // Take up available space
		height: '100%', // Fill the height of the stateLayer
		// Font styles are inherited from labelText4
	},
	// Add new style for the Send Button
	sendButton: {
		padding: 8, // Make a decent touch target
		justifyContent: 'center',
		alignItems: 'center',
	},
	// Remove leadingIcon, content1, stateLayerIcon, iconLayout if no longer used elsewhere
	// leadingIcon: {
	//   width: 48,
	//   alignItems: "center",
	//   flexDirection: "row"
	// },
	// content1: {
	//   width: 40,
	//   borderRadius: 100,
	//   overflow: "hidden"
	// },
	// stateLayerIcon: {
	//   height: 40,
	//   alignSelf: "stretch"
	// },
	// iconLayout: {
	// 	maxWidth: "100%",
	// 	overflow: "hidden",
	// 	width: "100%"
	// },
	chatContainer: {
		alignSelf: "stretch",
		flexDirection: "row", // Keep this from swipeFlexBox
		alignItems: "center", // Keep this from swipeFlexBox
		gap: 10, // Keep this from swipeFlexBox
	},
	bottomContainer: {
		alignSelf: "stretch"
	},
	textCenteredParent: {
		borderTopLeftRadius: 32,
		borderTopRightRadius: 32,
		backgroundColor: "#fff",
		paddingVertical: 24,
		paddingHorizontal: 16,
		alignItems: "center",
		alignSelf: "stretch",
		flex: 1
	},
	content: {
		// Removed: top: 52,
		// Removed: height: 840,
		// Removed: left: 0,
		// Removed: position: "absolute"
		flex: 1, // Make it take available vertical space
		width: "100%", // Make it take full width
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
		backgroundColor: 'transparent', // Ensure SafeAreaView is transparent if it had a color
		height: 892,
		overflow: "hidden",
		width: "100%",
		flex: 1
	}
});

export default Chat;
