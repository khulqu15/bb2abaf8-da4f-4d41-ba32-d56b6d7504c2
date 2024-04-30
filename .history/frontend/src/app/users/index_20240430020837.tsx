import React, { useEffect, useState } from "react";
import axios from "axios";
import api from "@/services/api";
import { User } from "@/interface/user";

const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string>('')

    useEffect(() => {
        api.get<User[]>('users')
            .then((response) => {
                setUsers(response.data)
                setLoading(false)
            })
            .catch((error) => {
                setError('An error occured while fetching data')
                console.error(error)
                setLoading(false)
            })
    }, [])

    if(loading) return <p>Loading...</p>
    if(error) return <p>Error: {error}</p>

    return (
        <div>
            <h1>Users</h1>
            <ul>
                {users.map(user => (
                    <li key={user.id}>
                        {user.first_name} {user.last_name} - {user.email}
                    </li>
                ))}
            </ul>
        </div>
    )
}
