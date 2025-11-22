import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import TabContent from './TabContent';

const BottomTabs = () => {
    const [selectedTab, setSelectedTab] = useState('Home');

    const tabs = [
        { name: 'Home', label: 'Home' },
        { name: 'Profile', label: 'Profile' },
        { name: 'Settings', label: 'Settings' },
    ];

    return (
        <View style={{ flex: 1 }}>
            <TabContent selectedTab={selectedTab} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', padding: 10 }}>
                {tabs.map(tab => (
                    <TouchableOpacity key={tab.name} onPress={() => setSelectedTab(tab.name)}>
                        <Text style={{ fontWeight: selectedTab === tab.name ? 'bold' : 'normal' }}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

export default BottomTabs;