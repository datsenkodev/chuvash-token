import React from 'react';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

const TabContent = ({ selectedTab }) => {
    switch (selectedTab) {
        case 'Home':
            return <HomeScreen />;
        case 'Profile':
            return <ProfileScreen />;
        case 'Settings':
            return <SettingsScreen />;
        default:
            return <HomeScreen />;
    }
};

export default TabContent;