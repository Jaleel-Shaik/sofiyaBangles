import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity 
      onPress={() => setExpanded(!expanded)}
      className="bg-white p-5 rounded-2xl mb-4 border border-slate-100 shadow-sm"
    >
      <View className="flex-row justify-between items-center">
        <Text className={`flex-1 pr-4 font-bold ${expanded ? 'text-[#FF1F4B]' : 'text-slate-800'}`}>
          {question}
        </Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={expanded ? "#FF1F4B" : "#94a3b8"} />
      </View>
      {expanded && (
        <Text className="text-slate-600 mt-3 leading-5">
          {answer}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default function FAQScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const faqs = [
    {
      q: "How do I find my bangle size?",
      a: "You can find your size using our Size Guide available on the product page. Or, if you know your standard size (like 2.2, 2.4, etc.), simply update it in your 'Size Preferences' to see tailored recommendations."
    },
    {
      q: "What is your return policy?",
      a: "We offer a 7-day return policy for unused items in their original packaging. Custom-sized items or personalized orders cannot be returned."
    },
    {
      q: "How long does shipping take?",
      a: "Standard shipping takes 3-5 business days within the state, and 5-7 business days for national delivery. You'll receive a tracking link via WhatsApp once dispatched."
    },
    {
      q: "Are the materials authentic?",
      a: "Absolutely. We pride ourselves on sourcing high-quality, authentic materials. Each purchase comes with an authenticity guarantee."
    },
    {
      q: "Do you ship internationally?",
      a: "Currently, we only ship nationwide. We hope to expand to international shipping soon!"
    }
  ];

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View 
        className="px-6 pb-4 bg-white shadow-sm flex-row items-center"
        style={{ paddingTop: Math.max(insets.top + 8, 40) }}
      >
        <TouchableOpacity 
          className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-4"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-slate-800">Help & FAQs</Text>
      </View>
      
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center bg-amber-50 p-4 rounded-2xl border border-amber-100 mb-6">
          <Ionicons name="bulb-outline" size={24} color="#f59e0b" className="mr-3" />
          <Text className="flex-1 ml-3 text-amber-800 text-sm leading-5">
            Browse our most common questions below. Need more help? Head over to the Contact Support page.
          </Text>
        </View>

        <Text className="text-lg font-extrabold text-slate-800 mb-4">Frequently Asked Questions</Text>
        
        {faqs.map((faq, idx) => (
          <FAQItem key={idx} question={faq.q} answer={faq.a} />
        ))}

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
