import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../store/ThemeContext';
import SettingsScreen from '../screens/SettingsScreen';
import AboutScreen from '../screens/AboutScreen';
import CategoryManageScreen from '../screens/CategoryManageScreen';
import BudgetScreen from '../screens/BudgetScreen';
import FamilySetupScreen from '../screens/FamilySetupScreen';
import MultiFamilyScreen from '../screens/MultiFamilyScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AccountManageScreen from '../screens/AccountManageScreen';
import AutoTransactionManageScreen from '../screens/AutoTransactionManageScreen';
import TransferScreen from '../screens/TransferScreen';
import SmartAssistantSettingsScreen from '../screens/SmartAssistantSettingsScreen';

export type SettingsStackParamList = {
  SettingsMain: undefined;
  About: undefined;
  CategoryManage: undefined;
  Budget: undefined;
  FamilySetup: undefined;
  MultiFamily: undefined;
  Profile: undefined;
  AccountManage: undefined;
  AutoTransactionManage: undefined;
  Transfer: undefined;
  SmartAssistantSettings: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerBackTitle: '返回',
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{
          title: '关于',
        }}
      />
      <Stack.Screen
        name="CategoryManage"
        component={CategoryManageScreen}
        options={{
          title: '分类管理',
        }}
      />
      <Stack.Screen
        name="Budget"
        component={BudgetScreen}
        options={{
          title: '预算管理',
        }}
      />
      <Stack.Screen
        name="FamilySetup"
        component={FamilySetupScreen}
        options={{
          title: '家庭记账',
        }}
      />
      <Stack.Screen
        name="MultiFamily"
        component={MultiFamilyScreen}
        options={{
          title: '家庭管理',
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: '个人资料',
        }}
      />
      <Stack.Screen
        name="AccountManage"
        component={AccountManageScreen}
        options={{
          title: '资金管理',
        }}
      />
      <Stack.Screen
        name="AutoTransactionManage"
        component={AutoTransactionManageScreen}
        options={{
          title: '自动记账',
        }}
      />
      <Stack.Screen
        name="Transfer"
        component={TransferScreen}
        options={{
          title: '账户转账',
        }}
      />
      <Stack.Screen
        name="SmartAssistantSettings"
        component={SmartAssistantSettingsScreen}
        options={{
          title: '智能助手设置',
        }}
      />
    </Stack.Navigator>
  );
}
