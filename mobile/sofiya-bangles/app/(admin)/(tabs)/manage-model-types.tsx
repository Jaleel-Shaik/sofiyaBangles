import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { getModelTypes, ModelType } from '../../../src/api/modelTypes';
import { createModelType, updateModelType, deleteModelType } from '../../../src/api/admin';

export default function ManageModelTypesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [modelTypes, setModelTypes] = useState<ModelType[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchModelTypes = async () => {
    setLoading(true);
    try {
      const data = await getModelTypes();
      setModelTypes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelTypes();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for the Model Type.');
      return;
    }

    setSaving(true);
    try {
      await createModelType({
        name
      });
      setIsAdding(false);
      setName('');
      fetchModelTypes();
      Alert.alert('Success', 'Model Type created successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (mt: ModelType) => {
    setEditingId(mt.id);
    setEditName(mt.name);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    if (!editName.trim()) {
      Alert.alert('Error', 'Please enter a name.');
      return;
    }
    setUpdating(true);
    try {
      await updateModelType(editingId, { name: editName });
      setEditingId(null);
      setEditName('');
      fetchModelTypes();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this Model Type?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteModelType(id);
            fetchModelTypes();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View 
        className="px-6 pb-6 bg-rose-50 rounded-b-[32px] shadow-sm flex-row items-center justify-between z-10"
        style={{ paddingTop: Math.max(insets.top + 16, 40) }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity 
            className="w-10 h-10 bg-white rounded-full items-center justify-center mr-4 shadow-sm"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#e11d48" />
          </TouchableOpacity>
          <View>
            <Text className="text-[#C25B3E] font-medium text-xs uppercase tracking-wider mb-0.5">Admin Panel</Text>
            <Text className="text-2xl font-extrabold text-rose-700 font-serif">Model Types</Text>
          </View>
        </View>
        {!isAdding && (
          <TouchableOpacity onPress={() => setIsAdding(true)} className="bg-[#C1275A] px-4 py-2 rounded-full shadow-sm">
            <Text className="text-white font-bold text-sm">+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#C1275A" />
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          {isAdding && (
            <View className="bg-white p-5 rounded-3xl mb-6 shadow-sm border border-slate-100">
              <Text className="text-lg font-extrabold text-slate-800 mb-4">Create Model Type</Text>
              
              <Text className="text-xs font-bold text-slate-500 mb-2 uppercase">Model Type Name (e.g. Bangles, Rings)</Text>
              <TextInput 
                value={name}
                onChangeText={setName}
                placeholder="Name"
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 font-bold mb-4"
              />

              <View className="flex-row justify-end mt-4">
                <TouchableOpacity onPress={() => setIsAdding(false)} className="px-5 py-3 mr-2">
                  <Text className="text-slate-500 font-bold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={saving} className="bg-[#C1275A] px-6 py-3 rounded-full flex-row items-center">
                  {saving ? <ActivityIndicator size="small" color="white" /> : <Text className="text-white font-bold">Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {modelTypes.map(mt => (
            <View key={mt.id} className="bg-white p-5 rounded-3xl mb-4 shadow-sm border border-slate-100 flex-row items-center justify-between">
              {editingId === mt.id ? (
                <View className="flex-1 mr-2">
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-800 font-bold mb-2"
                  />
                  <View className="flex-row justify-end">
                    <TouchableOpacity onPress={() => setEditingId(null)} className="px-3 py-2 mr-2">
                      <Text className="text-slate-500 font-bold text-xs">Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleUpdate} disabled={updating} className="bg-[#C1275A] px-4 py-2 rounded-full">
                      {updating ? <ActivityIndicator size="small" color="white" /> : <Text className="text-white font-bold text-xs">Save</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <Text className="text-lg font-extrabold text-slate-800 flex-1">{mt.name}</Text>
                  <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => startEditing(mt)} className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center mr-2">
                      <Ionicons name="pencil" size={16} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(mt.id)} className="w-8 h-8 rounded-full bg-rose-50 items-center justify-center">
                      <Ionicons name="trash" size={16} color="#C1275A" />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ))}
          
          <View className="h-10" />
        </ScrollView>
      )}
    </View>
  );
}
