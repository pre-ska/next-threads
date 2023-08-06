"use server";

import { FilterQuery, SortOrder } from "mongoose";
import { revalidatePath } from "next/cache";

import Community from "../models/community.model";
import Thread from "../models/thread.model";
import User from "../models/user.model";

import { connectToDB } from "../mongoose";

/*******************************************************/
export async function fetchUser(userId: string) {
  try {
    connectToDB();

    return await User.findOne({ id: userId }).populate({
      path: "communities",
      model: Community,
    });
  } catch (error: any) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
}

interface Params {
  userId: string;
  username: string;
  name: string;
  bio: string;
  image: string;
  path: string;
}

export async function updateUser({
  userId,
  bio,
  name,
  path,
  username,
  image,
}: Params): Promise<void> {
  try {
    connectToDB();

    await User.findOneAndUpdate(
      { id: userId },
      {
        username: username.toLowerCase(),
        name,
        bio,
        image,
        onboarded: true,
      },
      { upsert: true }
    );

    if (path === "/profile/edit") {
      revalidatePath(path);
    }
  } catch (error: any) {
    throw new Error(`Failed to create/update user: ${error.message}`);
  }
}

/*******************************************************/
export async function fetchUserPosts(userId: string) {
  try {
    connectToDB();

    // Find all threads authored by the user with the given userId
    const threads = await User.findOne({ id: userId }).populate({
      path: "threads",
      model: Thread,
      populate: [
        {
          path: "community",
          model: Community,
          select: "name id image _id", // Select the "name" and "_id" fields from the "Community" model
        },
        {
          path: "children",
          model: Thread,
          populate: {
            path: "author",
            model: User,
            select: "name image id", // Select the "name" and "_id" fields from the "User" model
          },
        },
      ],
    });
    return threads;
  } catch (error) {
    console.error("Error fetching user threads:", error);
    throw error;
  }
}

/*******************************************************/
// Almost similar to Thead (search + pagination) and Community (search + pagination)
export async function fetchUsers({
  userId,
  searchString = "",
  pageNumber = 1,
  pageSize = 20,
  sortBy = "desc",
}: {
  userId: string;
  searchString?: string;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: SortOrder;
}) {
  try {
    connectToDB();

    // Calculate the number of users to skip based on the page number and page size.
    const skipAmount = (pageNumber - 1) * pageSize;

    // Create a case-insensitive regular expression for the provided search string.
    const regex = new RegExp(searchString, "i");

    // Osnovni query objekt
    // ! FilterQuery type dolazi iz mongoose
    // ! izbaci korisnika koji pretraživa da ne bude u rezultatima - not equal
    const query: FilterQuery<typeof User> = {
      id: { $ne: userId },
    };

    // ako postoji search, traži po name i username - $or
    // a ako ne postoji, onda vrati sve korisnike - po paginaciji
    if (searchString.trim() !== "") {
      query.$or = [
        { username: { $regex: regex } },
        { name: { $regex: regex } },
      ];
    }

    //  sortiranje uvijek po createdAt.... order je dinamički
    const sortOptions = { createdAt: sortBy };

    // ! finalni query
    const usersQuery = User.find(query)
      .sort(sortOptions)
      .skip(skipAmount)
      .limit(pageSize);

    // ukupni broj rezultata bez paginacije
    const totalUsersCount = await User.countDocuments(query);

    // ! exec finalni query
    const users = await usersQuery.exec();

    // dali postoji više korisnika od trenutne paginacije
    const isNext = totalUsersCount > skipAmount + users.length;

    return { users, isNext };
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

/*******************************************************/
export async function getActivity(userId: string) {
  try {
    connectToDB();

    // svi threadovi od trnutnog korisnika
    const userThreads = await Thread.find({ author: userId });

    // dohvati sve odgovore za svaki pojedini post /thread
    // to je pod children prop u svakom postu
    // dobijem niz postova kao rezultat
    const childThreadIds = userThreads.reduce((acc, userThread) => {
      return acc.concat(userThread.children);
    }, []);

    // dohvati sve postove/threadove po nizu iz prethodne funkcije
    // samo exludaj postove trnutnog korisnika
    const replies = await Thread.find({
      _id: { $in: childThreadIds }, // svi postovi iz prethodnog niza
      author: { $ne: userId }, // ne od trenutnog korisnika
    }).populate({
      path: "author", // popuni author field
      model: User, // po čvoru iz User kolekcije
      select: "name image _id", // ono šta želim da mi se popuni za svakog autora
    });

    return replies;
  } catch (error) {
    console.error("Error fetching replies: ", error);
    throw error;
  }
}
