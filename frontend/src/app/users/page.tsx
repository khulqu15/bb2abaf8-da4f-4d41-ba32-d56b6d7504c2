"use client"

import React, { useEffect, useRef, useState } from "react";
import api from "@/services/api";
import { User } from "@/interface/user";

const UsersPage: React.FC = () => {
    const [users, setUsers]: any = useState<User[]>([])
    const prevUsersRef = useRef (users)
    const [loading, setLoading] = useState<boolean>(true)
    const [errorView, setError] = useState<string>('')
    const [selectedUserData, setSelectedUserData] = useState<any>([])
    const [newUsers, setNewUsers] = useState<any>([])
    const [sortColumn, setSortColumn] = useState('')
    const [sortDirection, setSortDirection] = useState('asc')
    const [exceptions, setExceptions] = useState([])
    const [roles, setRoles] = useState([])

    useEffect(() => {
        fetchUsers(1)
    }, [sortColumn, sortDirection])

    const fetchUsers = (page: number) => {
        api.get<User[]>(`users?page=${page}`, {
            params: {
                order_by: sortColumn,
                direction: sortDirection,
                per_page: 15,
            }
        })
        .then((response) => {
            setUsers(response.data)
            setExceptions([])
            setLoading(false)
        })
        .catch((error) => {
            setError('An error occured while fetching data')
            setLoading(false)
        })
    }

    const handleSort = (columnName: string) => {
        const direction = sortColumn === columnName && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortColumn(columnName);
        setSortDirection(direction);
        fetchUsers(1);
    };

    const handlePageChange = (page: number) => {
        if (page > 0 && page <= Math.ceil(users.total / users.per_page)) {
            fetchUsers(page);
        }
    };

    const handleUserClick = (id: number, field: string, data: string) => {
        const currentSelected = {
            id: id,
            field: field,
            data: data,
            key: `${id}-${field}`
        }
        setSelectedUserData((prevSelected: any): any => {
            if(prevSelected.length <= 0) return [currentSelected]
            const index = prevSelected.findIndex((item: any) => item.id === id && item.hasOwnProperty(field));
            if (index === -1) return [...prevSelected, currentSelected];
            else {
                const updatedItems = [...prevSelected];
                updatedItems[index] = {...updatedItems[index], currentSelected };
                return updatedItems;
            }
        })
    }

    const handleInputChange = (id: number, field: string, newValue: string) => {
        if (field === 'role_id') {
            setSelectedUserData((prevSelected: any) => prevSelected.map((item: any) => {
                if (item.key === `${id}-${field}`) {
                    return { ...item, data: newValue };
                }
                return item;
            }));
            api.get(`roles`, { params: { search: newValue } })
                .then(response => {
                    setRoles(response.data.data)
                    console.log(roles)
                })
                .catch(error => console.error('Failed to fetch role', error));
        } else {
            setSelectedUserData((prevSelected: any) => prevSelected.map((item: any) => {
                if (item.key === `${id}-${field}`) {
                    return { ...item, data: newValue };
                }
                return item;
            }));
        }
    };

    const handleRemoveItem = (id: number, field: string, event: React.MouseEvent) => {
        event.stopPropagation();
        setSelectedUserData((prevSelected: any) => prevSelected.filter((item: any) => item.key !== `${id}-${field}`));
    };

    const updateData = async() => {
        const updatesByUser: any = {}
        prevUsersRef.current = [...users.data]

        selectedUserData.forEach((update: any) => {
            if(!updatesByUser[update.id]) {
                const existingUserData = users.data.find((user: any) => user.hashid === update.id);
                updatesByUser[update.id] = { ...existingUserData };
            }
            updatesByUser[update.id][update.field] = update.data;
        })

        const promises = Object.keys(updatesByUser).map((user: any) => {
            return api.put(`users/${user}`, updatesByUser[user])
        })

        try {
            const results = await Promise.all(promises)
            console.log("All data saved successfully:", results);
            setSelectedUserData([]);
            fetchUsers(1)
        } catch (error: any) {
            let error_type = ''
            const hashidUrl = error.config.url
            const hashid = hashidUrl.split('/')[1]

            const emailDetection = error.response.data.message.split('email')
            const role_id = error.response.data.message.split('role_id')
            const first_name = error.response.data.message.split('first_name')
            const last_name = error.response.data.message.split('last_name')
            const phone = error.response.data.message.split('phone')

            console.log(phone)

            if (emailDetection.length > 1) error_type = 'email'
            if (role_id.length > 1) error_type = 'role_id'
            if (first_name.length > 1) error_type = 'first_name'
            if (last_name.length > 1) error_type = 'last_name'
            if (phone.length > 1) error_type = 'phone'

            const new_error = {
                id: hashid,
                field: error_type,
                message: error.response.data.message
            }

            console.log(new_error)

            setExceptions((prev: any): any => {
                if(prev.length <= 0) return [new_error]

                const index = prev.findIndex((item: any) => item.id === hashid && item.hasOwnProperty(error_type));
                if (index === -1) return [...prev, new_error];
                else {
                    const updateErr = [...prev];
                    updateErr[index] = {...updateErr[index], new_error };
                    return updateErr;
                }
            })

            console.log(exceptions)
            console.error("Error saving data:", error);
        }
    }

    const handleAddNewUser = () => {
        prevUsersRef.current = [...users.data];
        const newUser = {
            first_name: '',
            last_name: '',
            role_id: '',
            phone: '',
            email: '',
            password: 'password',
            isNew: true,
        }
        setNewUsers([...newUsers, newUser]);
    }

    const saveNewUsers = async () => {
        const promises = newUsers.map((user: any) => {
            return api.post('/users', user);
        });

        try {
            await Promise.all(promises);
            console.log("All new users added successfully");
            setNewUsers([]);
            fetchUsers(1);
        } catch (error) {
            console.error("Error adding new users:", error);
        }
    };

    const handleRemoveNewItem = (user: any, index: number) => {
        setNewUsers((prevUsers: any) => prevUsers.filter((_: any, i: any) => i !== index));
    };

    const saveUserRoleDirectly = async (roleId: number, userHashId: number) => {
        try {
            const existingUserData = users.data.find((user: any) => user.hashid === userHashId);
            if (!existingUserData) {
                console.error("User not found in the current state");
                return;
            }
            const updatedUserData = { ...existingUserData, role_id: roleId };
            const response = await api.put(`users/${userHashId}`, updatedUserData);
            console.log("Role updated successfully:", response.data);
            fetchUsers(1);
            setRoles([])
        } catch (error: any) {
            console.error("Error updating user role:", error.response?.data || error.message);
        }
    };

    const handleUndo = () => {
        setUsers(prevUsersRef.current);
    };

    return (
        <div className="min-h-screen bg-base-200 w-full p-12">
            <div className="w-full flex items-center justify-between mb-12">
                <h1 className="text-xl font-bold">Users <span className="badge badge-primary">{ users.total }</span></h1>
                <div className="flex items-center gap-3">
                    <button id="btnAdd" onClick={handleAddNewUser} className="btn btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M11 9V5H9v4H5v2h4v4h2v-4h4V9zm-1 11a10 10 0 1 1 0-20a10 10 0 0 1 0 20"/></svg>
                    </button>
                    <button id="btnSave" onClick={() => {updateData(); saveNewUsers()}} className="btn btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 512 512"><path fill="currentColor" d="m465.94 119.76l-73.7-73.7A47.68 47.68 0 0 0 358.3 32H96a64 64 0 0 0-64 64v320a64 64 0 0 0 64 64h320a64 64 0 0 0 64-64V153.7a47.68 47.68 0 0 0-14.06-33.94M120 112h176a8 8 0 0 1 8 8v48a8 8 0 0 1-8 8H120a8 8 0 0 1-8-8v-48a8 8 0 0 1 8-8m139.75 319.91a80 80 0 1 1 76.16-76.16a80.06 80.06 0 0 1-76.16 76.16"/><circle cx="256" cy="352" r="48" fill="currentColor"/></svg>
                    </button>
                    <button id="btnUndo" className="btn bg-base-100">
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M7 19v-2h7.1q1.575 0 2.738-1T18 13.5T16.838 11T14.1 10H7.8l2.6 2.6L9 14L4 9l5-5l1.4 1.4L7.8 8h6.3q2.425 0 4.163 1.575T20 13.5t-1.737 3.925T14.1 19z"/></svg>
                    </button>
                </div>
            </div>
            <div className="w-full overflow-x-auto p-3 bg-base-300 rounded-xl">
                {loading ? (
                    <div className="flex justify-center items-center">
                        <div className="loader">Loading...</div>
                    </div>
                ) : errorView ? (
                    <p>Error: {errorView}</p>
                ) : (
                    <div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th onClick={() => handleSort('first_name')}>First Name {sortColumn == 'first_name' && sortDirection == 'desc' ? (
                                        <span className="badge badge-primary">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M3 3a1 1 0 0 0 0 2h11a1 1 0 1 0 0-2zm0 4a1 1 0 0 0 0 2h7a1 1 0 1 0 0-2zm0 4a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2zm12-3a1 1 0 1 0-2 0v5.586l-1.293-1.293a1 1 0 0 0-1.414 1.414l3 3a1 1 0 0 0 1.414 0l3-3a1 1 0 0 0-1.414-1.414L15 13.586z"/></svg>
                                        </span>
                                    ) : (<span className="badge"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M3 3a1 1 0 0 0 0 2h11a1 1 0 1 0 0-2zm0 4a1 1 0 0 0 0 2h5a1 1 0 0 0 0-2zm0 4a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2zm10 5a1 1 0 1 0 2 0v-5.586l1.293 1.293a1 1 0 0 0 1.414-1.414l-3-3a1 1 0 0 0-1.414 0l-3 3a1 1 0 1 0 1.414 1.414L13 10.414z"/></svg></span>)}</th>
                                    <th onClick={() => handleSort('last_name')}>Last Name {sortColumn == 'last_name' && sortDirection == 'desc' ? (
                                        <span className="badge badge-primary">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M3 3a1 1 0 0 0 0 2h11a1 1 0 1 0 0-2zm0 4a1 1 0 0 0 0 2h7a1 1 0 1 0 0-2zm0 4a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2zm12-3a1 1 0 1 0-2 0v5.586l-1.293-1.293a1 1 0 0 0-1.414 1.414l3 3a1 1 0 0 0 1.414 0l3-3a1 1 0 0 0-1.414-1.414L15 13.586z"/></svg>
                                        </span>
                                    ) : (<span className="badge"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M3 3a1 1 0 0 0 0 2h11a1 1 0 1 0 0-2zm0 4a1 1 0 0 0 0 2h5a1 1 0 0 0 0-2zm0 4a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2zm10 5a1 1 0 1 0 2 0v-5.586l1.293 1.293a1 1 0 0 0 1.414-1.414l-3-3a1 1 0 0 0-1.414 0l-3 3a1 1 0 1 0 1.414 1.414L13 10.414z"/></svg></span>)}</th>
                                    <th onClick={() => handleSort('role_id')}>Position {sortColumn == 'role_id' && sortDirection == 'desc' ? (
                                        <span className="badge badge-primary">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M3 3a1 1 0 0 0 0 2h11a1 1 0 1 0 0-2zm0 4a1 1 0 0 0 0 2h7a1 1 0 1 0 0-2zm0 4a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2zm12-3a1 1 0 1 0-2 0v5.586l-1.293-1.293a1 1 0 0 0-1.414 1.414l3 3a1 1 0 0 0 1.414 0l3-3a1 1 0 0 0-1.414-1.414L15 13.586z"/></svg>
                                        </span>
                                    ) : (<span className="badge"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M3 3a1 1 0 0 0 0 2h11a1 1 0 1 0 0-2zm0 4a1 1 0 0 0 0 2h5a1 1 0 0 0 0-2zm0 4a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2zm10 5a1 1 0 1 0 2 0v-5.586l1.293 1.293a1 1 0 0 0 1.414-1.414l-3-3a1 1 0 0 0-1.414 0l-3 3a1 1 0 1 0 1.414 1.414L13 10.414z"/></svg></span>)}</th>
                                    <th onClick={() => handleSort('phone')}>Phone {sortColumn == 'phone' && sortDirection == 'desc' ? (
                                        <span className="badge badge-primary">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M3 3a1 1 0 0 0 0 2h11a1 1 0 1 0 0-2zm0 4a1 1 0 0 0 0 2h7a1 1 0 1 0 0-2zm0 4a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2zm12-3a1 1 0 1 0-2 0v5.586l-1.293-1.293a1 1 0 0 0-1.414 1.414l3 3a1 1 0 0 0 1.414 0l3-3a1 1 0 0 0-1.414-1.414L15 13.586z"/></svg>
                                        </span>
                                    ) : (<span className="badge"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M3 3a1 1 0 0 0 0 2h11a1 1 0 1 0 0-2zm0 4a1 1 0 0 0 0 2h5a1 1 0 0 0 0-2zm0 4a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2zm10 5a1 1 0 1 0 2 0v-5.586l1.293 1.293a1 1 0 0 0 1.414-1.414l-3-3a1 1 0 0 0-1.414 0l-3 3a1 1 0 1 0 1.414 1.414L13 10.414z"/></svg></span>)}</th>
                                    <th onClick={() => handleSort('email')}>Email {sortColumn == 'email' && sortDirection == 'desc' ? (
                                        <span className="badge badge-primary">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M3 3a1 1 0 0 0 0 2h11a1 1 0 1 0 0-2zm0 4a1 1 0 0 0 0 2h7a1 1 0 1 0 0-2zm0 4a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2zm12-3a1 1 0 1 0-2 0v5.586l-1.293-1.293a1 1 0 0 0-1.414 1.414l3 3a1 1 0 0 0 1.414 0l3-3a1 1 0 0 0-1.414-1.414L15 13.586z"/></svg>
                                        </span>
                                    ) : (<span className="badge"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M3 3a1 1 0 0 0 0 2h11a1 1 0 1 0 0-2zm0 4a1 1 0 0 0 0 2h5a1 1 0 0 0 0-2zm0 4a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2zm10 5a1 1 0 1 0 2 0v-5.586l1.293 1.293a1 1 0 0 0 1.414-1.414l-3-3a1 1 0 0 0-1.414 0l-3 3a1 1 0 1 0 1.414 1.414L13 10.414z"/></svg></span>)}</th>
                                </tr>
                            </thead>
                            <tbody>
                            {newUsers.map((user: any, index: number) => (
                                <tr key={index}>
                                    <td>
                                        <button onClick={(e) => handleRemoveNewItem(user, index)} className="btn bg-base-200">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" fillRule="evenodd"><path d="M24 0v24H0V0zM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093c.012.004.023 0 .029-.008l.004-.014l-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014l-.034.614c0 .012.007.02.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"/><path fill="currentColor" d="m12 13.414l5.657 5.657a1 1 0 0 0 1.414-1.414L13.414 12l5.657-5.657a1 1 0 0 0-1.414-1.414L12 10.586L6.343 4.929A1 1 0 0 0 4.93 6.343L10.586 12l-5.657 5.657a1 1 0 1 0 1.414 1.414z"/></g></svg>
                                        </button>
                                    </td>

                                    {['first_name', 'last_name', 'role_id', 'phone', 'email'].map(field => (
                                        <td key={field}>
                                            <input
                                                type="text"
                                                value={user[field]}
                                                onChange={e => {
                                                    const updatedNewUsers = [...newUsers];
                                                    updatedNewUsers[index][field] = e.target.value;
                                                    setNewUsers(updatedNewUsers);
                                                }}
                                                className="input bg-base-300 input-bordered w-full"
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}

                            {users.data.map((user: any): any => (
                                <tr key={user.hashid}>
                                    <td>
                                        <img className="w-8 h-8 rounded-xl"
                                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.first_name + ' ' + user.last_name)}`}
                                            alt={`${user.first_name} ${user.last_name}`}/>
                                    </td>

                                    {['first_name', 'last_name', 'role_id', 'phone', 'email'].map((field: any) => {
                                        const key = `${user.hashid}-${field}`;
                                        const isSelected = selectedUserData.some((item: any) => item.key === key);
                                        const error: any = exceptions.find((error: any) => error.id == user.hashid && error.field == field);
                                        const editableValue = selectedUserData.find((item: any) => item.key === key)?.data || (field === 'role_id' ? user.role.name : user[field]);

                                        return (
                                            <td key={field} onClick={() => handleUserClick(user.hashid, field, field === 'role_id' ? user.role.name : user[field])}>
                                                {isSelected ? (
                                                    <div>
                                                        <div className="flex items-center gap-2 relative">
                                                            {field == 'role_id' ? (
                                                                <div>
                                                                    <input className="input bg-base-300 input-bordered"
                                                                        type="text"
                                                                        value={editableValue}
                                                                        onChange={(e) => handleInputChange(user.hashid, field, e.target.value)}
                                                                    />
                                                                    {roles.length > 0 && (
                                                                        <div className="absolute left-0 top-20 bg-base-100 z-20 left-0 w-full shadow-xl p-3 rounded-xl max-h-[20rem] overflow-y-auto">
                                                                            {roles.map((i: any): any => (
                                                                                <div onClick={() => saveUserRoleDirectly(i.id, user.hashid) } key={i.id || `${user.hashid}-${user.role_id}`} className="w-full p-3 bg-base-100 hover:bg-base-200 transition-all">{ i.name }</div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <input className="input bg-base-300 input-bordered"
                                                                    type="text"
                                                                    value={selectedUserData.find((item: any) => field == 'role_id' ? user.role.name : item.key === key)?.data || ''}
                                                                    onChange={(e) => handleInputChange(user.hashid, field, e.target.value)}
                                                                />
                                                            )}

                                                            <button onClick={(e) => handleRemoveItem(user.hashid, field, e)} className="btn bg-base-200">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" fillRule="evenodd"><path d="M24 0v24H0V0zM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093c.012.004.023 0 .029-.008l.004-.014l-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014l-.034.614c0 .012.007.02.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"/><path fill="currentColor" d="m12 13.414l5.657 5.657a1 1 0 0 0 1.414-1.414L13.414 12l5.657-5.657a1 1 0 0 0-1.414-1.414L12 10.586L6.343 4.929A1 1 0 0 0 4.93 6.343L10.586 12l-5.657 5.657a1 1 0 1 0 1.414 1.414z"/></g></svg>
                                                            </button>
                                                        </div>
                                                        {error && <div className="text-red-500 text-sm">{error.message}</div>}
                                                    </div>
                                                ) : (
                                                    field === 'role_id' ? user.role.name : user[field]
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        <div className="flex w-full justify-end items-center mt-5">
                            <button className="btn btn-ghost" onClick={() => handlePageChange(users.current_page - 1)}>{'<'}</button>
                            {[...Array(Math.ceil(users.total / users.per_page)).keys()].map(page => (
                                <button
                                    key={page + 1}
                                    className={`btn ${users.current_page === page + 1 ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => handlePageChange(page + 1)}>
                                    {page + 1}
                                </button>
                            ))}
                            <button className="btn btn-ghost" onClick={() => handlePageChange(users.current_page + 1)}>{'>'}</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default UsersPage;
