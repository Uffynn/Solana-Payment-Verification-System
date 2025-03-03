import axios from 'axios';

const SOLSCAN_API_URL = 'https://api.solscan.io/transaction';
const API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your actual API key

async function fetchSolscanTransactions(address: string) {
    try {
        const response = await axios.get(`${SOLSCAN_API_URL}`, {
            params: { address },
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return null;
    }
}

export default fetchSolscanTransactions;
