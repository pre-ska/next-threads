import mongoose from 'mongoose'

let isConnected = false; // is mongoose connected

export const connectToDB = async () => {
    // prevent unknown field queries
    mongoose.set('strictQuery', true)

    if (!process.env.MONGODB_URL) return console.log("Missing MongoDB URL");

    // If the connection is already established, return without creating a new connection.
    if (isConnected) {
        console.log("MongoDB connection already established");
        return;
    }

    // prvo spajanje
    try {
        await mongoose.connect(process.env.MONGODB_URL);
    
        isConnected = true; // flagiraj konekciju kao true za buduće provjere
        console.log("MongoDB connected");
    } catch (error) {
        console.log(error);
    }
}