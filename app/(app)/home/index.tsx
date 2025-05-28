import * as React from "react";
import { Image, StyleSheet, View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Video, ResizeMode } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Movyalogovector from "../../../assets/movyalogovector.svg"
import Sendicon from "../../../assets/sendicon.svg"
import Receiveicon from "../../../assets/receiveicon.svg"
import Addbutton from "../../../assets/addbutton.svg"
import Contactmock from "../../../assets/contactmock.svg"
import Contactmock1 from "../../../assets/contactmock.svg"
import Contactmock2 from "../../../assets/contactmock.svg"
import Contactmock3 from "../../../assets/contactmock.svg"
import Usdcvector from "../../../assets/usdclogo.svg"
import Arrowright from "../../../assets/arrowright.svg"
import Avavector from "../../../assets/avalogo.svg"
import Fab from "../../../assets/fab.svg"
import Sendbutton from "../../../assets/sendbutton.svg"
import { Padding, Gap, FontFamily, Color, FontSize, Border } from "./GlobalStyles";
import { useRouter } from "expo-router";

const Home = () => {
    const router = useRouter();

    const handleChatNavigation = () => {
        router.push('/(app)/chat');
    };

    const handleSendNavigation = () => {
        router.push('/(app)/send');
    };

    const handleReceiveNavigation = () => {
        router.push('/(app)/receive');
    };

    return (
        <SafeAreaView style={[styles.home, styles.homeLayout]}>
            <StatusBar style="light" />
			<Video
				source={require('../../../assets/bg/header-bg.webm')}
				style={styles.backgroundVideo}
				isLooping
				shouldPlay
				isMuted
				resizeMode={ResizeMode.COVER}
			/>
            <View style={styles.content}>
                <View style={[styles.topComponents, styles.componentsSpaceBlock]}>
                    <View style={styles.helloMessage}>
                        <View style={styles.userAvatarPlaceholder}>
                            <Image style={[styles.imageIcon, styles.homeLayout]} resizeMode="cover" />
                        </View>
                        <View style={styles.text}>
                            <Text style={[styles.hello, styles.helloTypo]}>Hello,</Text>
                            <View style={styles.text}>
                                <Text style={[styles.hello, styles.helloTypo]}>UserName</Text>
                                <Text style={[styles.hello, styles.helloTypo]}>!</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.helloMessage}>
                        <View style={[styles.balanceBox, styles.sendBg]}>
                            <View style={styles.content1}>
                                <Text style={styles.totalBalance}>Total Balance</Text>
                                <Text style={[styles.balanceValue, styles.helloTypo]}>$0.01</Text>
                            </View>
                            <Movyalogovector style={styles.movyaLogoVectorIcon} width={121} height={113} />
                        </View>
                        <View style={styles.actionButtons}>
                            <TouchableOpacity onPress={handleSendNavigation} style={styles.actionButtonTouchable}>
                                <View style={[styles.send, styles.tabFlexBox]}>
                                    <Sendicon style={styles.sendIcon} width={20} height={20} />
                                    <Text style={[styles.send1, styles.send1Typo]}>Send</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleReceiveNavigation} style={styles.actionButtonTouchable}>
                                <View style={[styles.send, styles.tabFlexBox]}>
                                    <Receiveicon width={20} height={20} />
                                    <Text style={[styles.send1, styles.send1Typo]}>Receive</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                      <View style={styles.contactsSectionIfNone}>
                        <Text style={[styles.addContacts, styles.send1Typo]}>Add Contacts</Text>
                        <View style={styles.contactsMockContainer}>
                            <Addbutton style={styles.addButtonIcon} width={32} height={32} />
                            <ScrollView 
                                horizontal={true} 
                                showsHorizontalScrollIndicator={false}
                                style={styles.contactListScrollView}
                                contentContainerStyle={styles.contactListContainer}
                            >
                                <View style={styles.contactIconsRow}>
                                    <Contactmock style={styles.contactMockItem} width={32} height={32} />
                                    <Contactmock1 style={styles.contactMockItem} width={32} height={32} />
                                    <Contactmock2 style={styles.contactMockItem} width={32} height={32} />
                                    <Contactmock3 style={styles.contactMockItem} width={32} height={32} />
                                    <Contactmock style={styles.contactMockItem} width={32} height={32} />
                                    <Contactmock1 style={styles.contactMockItem} width={32} height={32} />
                                    <Contactmock2 style={styles.contactMockItem} width={32} height={32} />
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </View>
                <View style={[styles.bottonComponents, styles.sendBg]}>
                    <View style={styles.tabs}>
                        <View style={[styles.tabActive, styles.tabFlexBox]}>
                            <Text style={[styles.labelText, styles.labelLayout]}>Assets</Text>
                        </View>
                        <View style={[styles.tabInactive, styles.suggestionBorder]}>
                            <Text style={[styles.labelText1, styles.labelTypo]}>History</Text>
                        </View>
                    </View>
                    <ScrollView style={styles.listingScrollView} contentContainerStyle={styles.listingContentContainer}>
                        <View style={styles.listing}>
                            <View style={[styles.assetCardMain, styles.buttonFlexBox]}>
                                <View style={styles.asset}>
                                    <Usdcvector style={styles.buttonIconLayout} width={48} height={48} />
                                    <View style={styles.assetId}>
                                        <Text style={[styles.assetName, styles.text2Typo]}>USD Coin</Text>
                                        <Text style={[styles.assetLetters, styles.labelTypo]}>USDC</Text>
                                    </View>
                                </View>
                                <View style={styles.rightItems}>
                                    <Text style={[styles.text2, styles.text2Typo]}>$0.00</Text>
                                    <View style={[styles.button, styles.buttonFlexBox]}>
                                        <Text style={styles.deposit}>Deposit</Text>
                                        <Arrowright style={styles.arrowRightIcon} width={12} height={12} />
                                    </View>
                                </View>
                            </View>
                            <View style={[styles.assetCard, styles.assetCardShadowBox]}>
                                <View style={styles.asset}>
                                    <Avavector width={48} height={48} />
                                    <View style={styles.assetId}>
                                        <Text style={[styles.text2, styles.text2Typo]}>AVAX</Text>
                                        <Text style={styles.labelTypo}>AVA</Text>
                                    </View>
                                </View>
                                <View style={styles.rightItems}>
                                    <Text style={[styles.text2, styles.text2Typo]}>$0.01</Text>
                                    <View style={[styles.button1, styles.suggestionFlexBox]}>
                                        <Text style={[styles.text4, styles.textTypo]}>+3.2%</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                    <View style={styles.inputContainer}>
                        <View style={styles.carouselContainer}>
                            <ScrollView 
                                horizontal={true} 
                                showsHorizontalScrollIndicator={false}
                                style={styles.suggestionsScrollView}
                                contentContainerStyle={styles.suggestionsContainer}
                            >
                                <View style={styles.suggestionsRow}> 
                                    <View style={styles.suggestion}>
                                        <Text style={[styles.labelText2, styles.labelTypo]}>Send Money to a Friend</Text>
                                    </View>
                                    <View style={styles.suggestion}>
                                        <Text style={[styles.labelText2, styles.labelTypo]}>Send Money to a Wallet</Text>
                                    </View>
                                    <View style={styles.suggestion}>
                                        <Text style={[styles.labelText2, styles.labelTypo]}>How to send AVA?</Text>
                                    </View>
                                    <View style={styles.suggestion}>
                                        <Text style={[styles.labelText2, styles.labelTypo]}>Who are you?</Text>
                                    </View>
                                </View>
                            </ScrollView>
                            <LinearGradient
                                colors={['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.fade, styles.leftFade]}
                                pointerEvents="none" 
                            />
                            <LinearGradient
                                colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 1)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.fade, styles.rightFade]}
                                pointerEvents="none" 
                            />
                        </View>
                        <View style={styles.inputFabContainer}>
                            <View style={styles.dollarButton}>
                                <Text style={styles.dollarButtonText}>$</Text>
                            </View>
                            <TouchableOpacity onPress={handleChatNavigation} style={styles.chatInputTouchable}>
                                <View style={[styles.chatInputButton, styles.suggestionBorder]}>
                                    <View style={styles.textContainer}>
                                        <Text style={[styles.askMovya, styles.text2Typo]}>Ask Movya</Text>
                                    </View>
                                    <Sendbutton width={48} height={48} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </SafeAreaView>);
};

const styles = StyleSheet.create({
    homeLayout: {
        width: "100%",
        flex: 1
    },
    componentsSpaceBlock: {
        paddingHorizontal: Padding.p_24,
        gap: Gap.gap_12
    },
    helloTypo: {
        textAlign: "left",
        fontFamily: FontFamily.geist
    },
    sendBg: {
        backgroundColor: Color.colorWhite,
        alignSelf: "stretch"
    },
    tabFlexBox: {
        padding: Padding.p_12,
        justifyContent: "center",
        alignItems: "center"
    },
    send1Typo: {
        textAlign: "center",
        lineHeight: 20,
        letterSpacing: -0.1,
        fontSize: FontSize.size_12,
        fontFamily: FontFamily.geist
    },
    buttonIconLayout: {},
    labelLayout: {
        lineHeight: 16,
        letterSpacing: 0
    },
    suggestionBorder: {
        borderWidth: 1,
        borderStyle: "solid",
        flex: 1
    },
    labelTypo: {
        color: Color.colorGray100,
        fontSize: 11,
        textAlign: "left",
        fontFamily: FontFamily.geist
    },
    buttonFlexBox: {
        backgroundColor: Color.colorRoyalblue200,
        flexDirection: "row",
        alignItems: "center"
    },
    text2Typo: {
        fontSize: FontSize.size_14,
        color: Color.colorGray100,
        textAlign: "left",
        fontFamily: FontFamily.geist
    },
    assetCardShadowBox: {
        borderRadius: Border.br_12,
        shadowOpacity: 1,
        elevation: 20,
        shadowRadius: 20,
        shadowOffset: {
            width: 0,
            height: 0
        },
        shadowColor: Color.colorGray300,
        gap: 0,
        justifyContent: "space-between",
        padding: Padding.p_12,
        alignSelf: "stretch"
    },
    suggestionFlexBox: {
        padding: Padding.p_8,
        justifyContent: "center",
        alignItems: "center"
    },
    textTypo: {
        fontSize: FontSize.size_12,
        fontWeight: "700",
        textAlign: "left",
        fontFamily: FontFamily.geist
    },
    imageIcon: {
        height: "100%",
        top: "0%",
        right: "0%",
        bottom: "0%",
        left: "0%",
        borderRadius: 400,
        maxWidth: "100%",
        maxHeight: "100%",
        position: "absolute",
        overflow: "hidden"
    },
    userAvatarPlaceholder: {
        borderRadius: 100,
        width: 32,
        height: 32,
        overflow: "hidden"
    },
    hello: {
        fontSize: FontSize.size_20,
        lineHeight: 32,
        color: Color.colorWhite
    },
    text: {
        gap: Gap.gap_4,
        flexDirection: "row",
        alignItems: "center"
    },
    helloMessage: {
        flexDirection: "row",
        gap: Gap.gap_12,
        alignSelf: "stretch",
        alignItems: "center"
    },
    totalBalance: {
        opacity: 0.7,
        color: Color.colorRoyalblue100,
        letterSpacing: -0.1,
        fontSize: FontSize.size_12,
        textAlign: "left",
        fontFamily: FontFamily.geist,
        alignSelf: "stretch"
    },
    balanceValue: {
        fontSize: 36,
        fontWeight: "700",
        color: Color.colorRoyalblue100,
        alignSelf: "stretch"
    },
    content1: {
        zIndex: 0,
        justifyContent: "center",
        flex: 1
    },
    movyaLogoVectorIcon: {
        top: 17,
        left: 169,
        zIndex: 1,
        position: "absolute"
    },
    balanceBox: {
        borderRadius: 32,
        paddingLeft: Padding.p_24,
        paddingTop: Padding.p_12,
        paddingBottom: Padding.p_12,
        flexDirection: "row",
        gap: Gap.gap_12,
        alignItems: "center",
        overflow: "hidden",
        flex: 1
    },
    sendIcon: {},
    send1: {
        fontWeight: "700",
        color: Color.colorRoyalblue100
    },
    send: {
        borderRadius: Border.br_24,
        backgroundColor: Color.colorWhite,
        alignSelf: "stretch",
        overflow: "hidden"
    },
    actionButtonTouchable: {
        alignSelf: "stretch",
        borderRadius: Border.br_24,
    },
    actionButtons: {
        width: 85,
        gap: Gap.gap_12
    },
    addContacts: {
        fontWeight: "600",
        color: Color.colorWhite
    },
    contactsSectionIfNone: {
        justifyContent: "center",
        gap: Gap.gap_12,
        alignSelf: "stretch",
        paddingVertical: Padding.p_12,
        marginTop: Gap.gap_16,
    },
    contactsMockContainer: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "stretch",
        gap: Gap.gap_12,
    },
    addButtonIcon: {
        borderRadius: Border.br_16,
    },
    contactListScrollView: {
        flex: 1,
    },
    contactListContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    contactIconsRow: {
        flexDirection: "row",
        gap: Gap.gap_16,
    },
    contactMockItem: {
        borderRadius: Border.br_16,
    },
    topComponents: {
        paddingVertical: 0,
        gap: Gap.gap_12,
        alignSelf: "stretch",
    },
    labelText: {
        fontWeight: "700",
        fontSize: FontSize.size_12,
        textAlign: "left",
        fontFamily: FontFamily.geist,
        color: Color.colorWhite
    },
    tabActive: {
        backgroundColor: Color.colorRoyalblue100,
        borderRadius: 25,
        flex: 1
    },
    labelText1: {
        lineHeight: 16,
        letterSpacing: 0
    },
    tabInactive: {
        borderColor: Color.colorGray400,
        borderWidth: 1,
        borderStyle: "solid",
        borderRadius: Border.br_20,
        padding: Padding.p_12,
        justifyContent: "center",
        alignItems: "center"
    },
    tabs: {
        gap: Gap.gap_16,
        flexDirection: "row",
    },
    assetName: {
        fontWeight: "700",
        alignSelf: "stretch"
    },
    assetLetters: {
        alignSelf: "stretch"
    },
    assetId: {
        justifyContent: "center"
    },
    asset: {
        flexDirection: "row",
        gap: Gap.gap_12,
        alignItems: "center",
        flex: 1
    },
    text2: {
        fontWeight: "700"
    },
    deposit: {
        lineHeight: 20,
        fontWeight: "700",
        color: Color.colorRoyalblue100,
        letterSpacing: -0.1,
        fontSize: FontSize.size_12,
        textAlign: "left",
        fontFamily: FontFamily.geist
    },
    arrowRightIcon: {},
    button: {
        paddingLeft: Padding.p_12,
        paddingRight: Padding.p_8,
        gap: 2,
        borderRadius: 25
    },
    rightItems: {
        alignItems: "flex-end",
        gap: Gap.gap_4
    },
    assetCardMain: {
        borderRadius: Border.br_12,
        shadowOpacity: 1,
        elevation: 20,
        shadowRadius: 20,
        shadowOffset: {
            width: 0,
            height: 0
        },
        shadowColor: Color.colorGray300,
        gap: 0,
        justifyContent: "space-between",
        padding: Padding.p_12,
        alignSelf: "stretch"
    },
    text4: {
        opacity: 0.5,
        fontWeight: "700",
        color: Color.colorRoyalblue100
    },
    button1: {
        height: 24,
        borderRadius: Border.br_20,
        flexDirection: "row"
    },
    assetCard: {
        flexDirection: "row",
        alignItems: "center"
    },
    listing: {
        gap: Gap.gap_12,
        alignSelf: "stretch",
        alignItems: "center",
    },
    labelText2: {
        lineHeight: 14,
        letterSpacing: 0,
        textAlign: 'center',
    },
    suggestion: {
        borderRadius: Border.br_16,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: Color.colorGray400,
        paddingVertical: Padding.p_8,
        paddingHorizontal: Padding.p_12,
        justifyContent: "center",
        alignItems: "center",
    },
    fabIcon: {
        borderRadius: Border.br_16
    },
    askMovya: {
        letterSpacing: 1,
        lineHeight: 24,
        flex: 1,
        color: Color.colorGray200,
    },
    textContainer: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1
    },
    chatInputButton: {
        borderRadius: 64,
        borderColor: Color.colorGray200,
        paddingLeft: 16,
        borderWidth: 1,
        borderStyle: "solid",
        height: 56,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        flex: 1,
        backgroundColor: Color.colorWhite,
    },
    chatInputTouchable: {
        flex: 1,
        borderRadius: 64,
    },
    inputFabContainer: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "stretch",
        gap: Gap.gap_12
    },
    inputContainer: {
        alignSelf: "stretch",
        gap: Gap.gap_12,
    },
    bottonComponents: {
        backgroundColor: Color.colorWhite,
        alignSelf: "stretch",
        flex: 1,
        flexShrink: 1,
        flexDirection: "column",
        justifyContent: "space-between",
        borderTopLeftRadius: Border.br_32,
        borderTopRightRadius: Border.br_32,
        paddingHorizontal: Padding.p_12,
        paddingTop: Padding.p_24,
        paddingBottom: Padding.p_8,
    },
    content: {
        flex: 1,
        width: "100%",
        flexDirection: "column",
    },
    home: {
        flex: 1,
        backgroundColor: Color.colorGray400,
    },
    backgroundVideo: {
        ...StyleSheet.absoluteFillObject,
        zIndex: -1,
    },
    listingScrollView: {
        maxHeight: 250,
        width: "100%",
        flexShrink: 1,
    },
    listingContentContainer: {
        alignItems: "center",
        paddingBottom: Gap.gap_12,
    },
    suggestionsScrollView: {
        width: "100%",
        maxHeight: 60,
    },
    suggestionsContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Padding.p_12,
    },
    suggestionsRow: {
        flexDirection: "row",
        gap: Gap.gap_4,
    },
    carouselContainer: {
        position: 'relative',
        width: "100%",
    },
    fade: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 30, 
        height: '100%',
    },
    leftFade: {
        left: 0,
    },
    rightFade: {
        right: 0,
    },
    dollarButton: {
        width: 56,
        height: 56,
        borderRadius: Border.br_16,
        backgroundColor: Color.colorRoyalblue100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dollarButtonText: {
        color: Color.colorWhite,
        fontSize: FontSize.size_20,
        fontWeight: 'bold',
        fontFamily: FontFamily.geist,
    },
});

export default Home;
